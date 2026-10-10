import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { search, dueOnly } = req.query;
    const models = getTenantDb(req.customerCode);

    const query = { isActive: true };
    if (dueOnly === 'true') {
      query.balanceDue = { $gt: 0 };
    }
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    const customers = await models.Customer.find(query).sort({ balanceDue: -1, name: 1 });
    const totalPending = customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);

    res.json({ customers, totalPending });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { id, name, phone, address, creditLimit, openingBalance, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Customer name is required' });

    const models = getTenantDb(req.customerCode);

    if (id) {
      const updated = await models.Customer.findByIdAndUpdate(id, req.body, { new: true });
      return res.json(updated);
    }

    const opBal = parseFloat(openingBalance) || 0;
    const customer = await models.Customer.create({
      name,
      phone: phone || '',
      address: address || '',
      creditLimit: parseFloat(creditLimit) || 0,
      openingBalance: opBal,
      balanceDue: opBal,
      notes: notes || ''
    });

    if (opBal > 0) {
      await models.CustomerLedger.create({
        customerId: customer._id,
        date: new Date(),
        type: 'Opening',
        particulars: 'Opening Balance Due',
        debit: opBal,
        credit: 0,
        balance: opBal,
        mode: 'Opening',
        note: 'Carried forward balance'
      });
    }

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Error saving customer', error: error.message });
  }
});

router.get('/:id/ledger', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const customer = await models.Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const entries = await models.CustomerLedger.find({ customerId: req.params.id }).sort({ date: 1 });
    res.json({ customer, ledger: entries });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ledger', error: error.message });
  }
});

router.post('/:id/receive-payment', protect, async (req, res) => {
  try {
    const { amount, mode = 'Cash', date = new Date(), note } = req.body;
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ message: 'Enter a valid payment amount' });
    }

    const models = getTenantDb(req.customerCode);
    const customer = await models.Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const newBalance = Math.max(0, (customer.balanceDue || 0) - payAmount);
    await models.Customer.findByIdAndUpdate(customer._id, { balanceDue: newBalance });

    const entry = await models.CustomerLedger.create({
      customerId: customer._id,
      date: new Date(date),
      type: 'Payment',
      particulars: `Payment Received (${mode})`,
      debit: 0,
      credit: payAmount,
      balance: newBalance,
      mode,
      note: note || ''
    });

    res.json({
      message: `Payment of ₹${payAmount} recorded successfully`,
      balanceDue: newBalance,
      entry
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
});

router.get('/:id/reminder-message', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const customer = await models.Customer.findById(req.params.id);
    const settings = await models.ShopSetting.findOne();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const shopName = settings?.shopName || 'our shop';
    const msg = `Dear ${customer.name}, your pending balance at ${shopName} is ₹${(customer.balanceDue || 0).toLocaleString('en-IN')}. Please clear it at your earliest convenience. Thank you!`;
    const whatsappUrl = customer.phone ? `https://wa.me/91${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}` : '';

    res.json({ message: msg, whatsappUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error generating message', error: error.message });
  }
});

export default router;
