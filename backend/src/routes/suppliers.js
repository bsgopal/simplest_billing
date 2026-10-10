import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const suppliers = await models.Supplier.find({ isActive: true }).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { id, name, phone, address, gstin, openingBalance } = req.body;
    if (!name) return res.status(400).json({ message: 'Supplier name is required' });

    const models = getTenantDb(req.customerCode);
    if (id) {
      const updated = await models.Supplier.findByIdAndUpdate(id, req.body, { new: true });
      return res.json(updated);
    }

    const supplier = await models.Supplier.create({
      name,
      phone: phone || '',
      address: address || '',
      gstin: gstin || '',
      openingBalance: parseFloat(openingBalance) || 0,
      balanceDue: parseFloat(openingBalance) || 0
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error creating supplier', error: error.message });
  }
});

router.post('/:id/pay', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const pay = parseFloat(amount) || 0;
    const models = getTenantDb(req.customerCode);
    const supp = await models.Supplier.findById(req.params.id);
    if (!supp) return res.status(404).json({ message: 'Supplier not found' });

    const newBal = Math.max(0, (supp.balanceDue || 0) - pay);
    supp.balanceDue = newBal;
    await supp.save();

    res.json({ message: 'Payment recorded', balanceDue: newBal });
  } catch (error) {
    res.status(500).json({ message: 'Error recording supplier payment', error: error.message });
  }
});

export default router;
