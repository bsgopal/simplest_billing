import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

async function generateBillNo(models) {
  const lastBill = await models.Bill.findOne().sort({ billSequence: -1 });
  const nextSeq = lastBill && lastBill.billSequence ? lastBill.billSequence + 1 : 1;
  const settings = await models.ShopSetting.findOne();
  const prefix = settings?.billPrefix || 'BILL-';
  const padded = String(nextSeq).padStart(5, '0');
  return { billNo: `${prefix}${padded}`, billSequence: nextSeq };
}

router.post('/', protect, async (req, res) => {
  try {
    const { items, customer, billDiscount = 0, payments, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Please add at least one item to the bill' });
    }

    const models = getTenantDb(req.customerCode);
    const settings = await models.ShopSetting.findOne();

    let subTotal = 0;
    let taxAmount = 0;
    let taxableAmount = 0;
    const processedItems = [];

    for (const line of items) {
      const qty = parseFloat(line.qty) || 1;
      const rate = parseFloat(line.rate) || 0;
      const lineDisc = parseFloat(line.lineDiscount) || 0;
      const lineAmount = Math.max(0, (qty * rate) - lineDisc);
      subTotal += lineAmount;

      const gst = parseFloat(line.gstPercent) || 0;
      let lineTax = 0;
      let lineTaxable = lineAmount;

      if (settings?.chargeGst && gst > 0) {
        if (settings?.priceIncludesGst) {
          lineTaxable = lineAmount / (1 + (gst / 100));
          lineTax = lineAmount - lineTaxable;
        } else {
          lineTaxable = lineAmount;
          lineTax = lineAmount * (gst / 100);
        }
      }

      taxAmount += lineTax;
      taxableAmount += lineTaxable;
      const lineCgst = lineTax / 2;
      const lineSgst = lineTax / 2;

      processedItems.push({
        itemId: line.itemId || null,
        name: line.name,
        qty,
        unit: line.unit || 'pcs',
        rate,
        lineDiscount: lineDisc,
        amount: lineAmount,
        purchasePrice: line.purchasePrice || 0,
        gstPercent: gst,
        hsn: line.hsn || '',
        taxableAmount: Math.round(lineTaxable * 100) / 100,
        taxAmount: Math.round(lineTax * 100) / 100,
        cgst: Math.round(lineCgst * 100) / 100,
        sgst: Math.round(lineSgst * 100) / 100
      });
    }

    const totalDiscount = parseFloat(billDiscount) || 0;
    const taxableAfterDisc = Math.max(0, subTotal - totalDiscount);
    let grandTotal = settings?.chargeGst && !settings?.priceIncludesGst
      ? (taxableAfterDisc + taxAmount)
      : taxableAfterDisc;

    let roundOff = 0;
    if (settings?.roundOff !== false) {
      const rounded = Math.round(grandTotal);
      roundOff = rounded - grandTotal;
      grandTotal = rounded;
    }

    const cash = parseFloat(payments?.cash) || 0;
    const upi = parseFloat(payments?.upi) || 0;
    const card = parseFloat(payments?.card) || 0;
    let credit = parseFloat(payments?.credit) || 0;

    const nonCreditPaid = cash + upi + card;

    let customerDoc = null;
    if (credit > 0 || (nonCreditPaid < grandTotal && customer?.customerId)) {
      if (!customer?.customerId && (!customer?.name || customer.name === 'Walk-in Customer')) {
        return res.status(400).json({ message: 'Credit (Udhar) sale requires a named customer' });
      }
      
      if (nonCreditPaid < grandTotal) {
        credit = grandTotal - nonCreditPaid;
      }

      if (customer?.customerId) {
        customerDoc = await models.Customer.findById(customer.customerId);
      } else if (customer?.name) {
        customerDoc = await models.Customer.findOne({ name: customer.name });
        if (!customerDoc) {
          customerDoc = await models.Customer.create({
            name: customer.name,
            phone: customer.phone || '',
            creditLimit: 0,
            balanceDue: 0
          });
        }
      }
    }

    const totalReceived = cash + upi + card + credit;
    if (totalReceived < grandTotal - 0.5) {
      return res.status(400).json({ message: `Payment (₹${totalReceived.toFixed(2)}) is less than Grand Total (₹${grandTotal.toFixed(2)})` });
    }

    const changeReturned = Math.max(0, (cash + upi + card) - (grandTotal - credit));
    const { billNo, billSequence } = await generateBillNo(models);
    const billStatus = credit > 0 ? 'Credit' : 'Paid';

    const newBill = await models.Bill.create({
      billNo,
      billSequence,
      date: new Date(),
      customer: {
        customerId: customerDoc?._id || customer?.customerId || null,
        name: customerDoc?.name || customer?.name || 'Walk-in Customer',
        phone: customerDoc?.phone || customer?.phone || ''
      },
      items: processedItems,
      subTotal,
      billDiscount: totalDiscount,
      taxableAmount: Math.round(taxableAfterDisc * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      cgstAmount: Math.round((taxAmount / 2) * 100) / 100,
      sgstAmount: Math.round((taxAmount / 2) * 100) / 100,
      roundOff: Math.round(roundOff * 100) / 100,
      grandTotal,
      payments: { cash, upi, card, credit },
      receivedAmount: totalReceived,
      changeReturned,
      status: billStatus,
      notes: notes || '',
      cashierId: req.user._id,
      cashierName: req.user.name
    });

    if (settings?.trackStock !== false) {
      for (const line of processedItems) {
        if (line.itemId) {
          await models.Item.findByIdAndUpdate(line.itemId, {
            $inc: { currentStock: -line.qty }
          });
        }
      }
    }

    if (credit > 0 && customerDoc) {
      const newBal = (customerDoc.balanceDue || 0) + credit;
      await models.Customer.findByIdAndUpdate(customerDoc._id, { balanceDue: newBal });
      await models.CustomerLedger.create({
        customerId: customerDoc._id,
        date: new Date(),
        type: 'Bill',
        billId: newBill._id,
        billNo: newBill.billNo,
        particulars: `Bill ${newBill.billNo}`,
        debit: credit,
        credit: 0,
        balance: newBal,
        mode: 'Credit',
        note: notes || ''
      });
    }

    res.status(201).json({
      message: 'Bill created successfully',
      bill: newBill
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ message: 'Error processing bill', error: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, startDate, endDate } = req.query;
    const models = getTenantDb(req.customerCode);

    const query = {};
    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { billNo: new RegExp(search, 'i') },
        { 'customer.name': new RegExp(search, 'i') },
        { 'customer.phone': new RegExp(search, 'i') }
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    const total = await models.Bill.countDocuments(query);
    const bills = await models.Bill.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      bills,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills', error: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const bill = await models.Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    const settings = await models.ShopSetting.findOne();
    res.json({ bill, shop: settings });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bill', error: error.message });
  }
});

router.post('/:id/cancel', protect, authorize('owner'), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Cancel reason is mandatory' });
    }

    const models = getTenantDb(req.customerCode);
    const bill = await models.Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    if (bill.status === 'Cancelled') {
      return res.status(400).json({ message: 'Bill is already cancelled' });
    }

    for (const item of bill.items) {
      if (item.itemId) {
        await models.Item.findByIdAndUpdate(item.itemId, {
          $inc: { currentStock: item.qty }
        });
      }
    }

    if (bill.payments?.credit > 0 && bill.customer?.customerId) {
      const cust = await models.Customer.findById(bill.customer.customerId);
      if (cust) {
        const newBal = Math.max(0, (cust.balanceDue || 0) - bill.payments.credit);
        await models.Customer.findByIdAndUpdate(cust._id, { balanceDue: newBal });
        await models.CustomerLedger.create({
          customerId: cust._id,
          date: new Date(),
          type: 'Return',
          billId: bill._id,
          billNo: bill.billNo,
          particulars: `Cancelled Bill ${bill.billNo}`,
          debit: 0,
          credit: bill.payments.credit,
          balance: newBal,
          mode: 'Reverse',
          note: reason
        });
      }
    }

    bill.status = 'Cancelled';
    bill.cancelReason = reason;
    bill.cancelledBy = req.user.name;
    bill.cancelledAt = new Date();
    await bill.save();

    res.json({ message: 'Bill cancelled and stock/credit reversed', bill });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling bill', error: error.message });
  }
});

router.get('/held/all', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const held = await models.HeldBill.find().sort({ heldAt: -1 });
    res.json(held);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching held bills', error: error.message });
  }
});

router.post('/hold', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const { customerName, customerPhone, items, subTotal, billDiscount, note } = req.body;
    const held = await models.HeldBill.create({
      customerName: customerName || 'Walk-in',
      customerPhone: customerPhone || '',
      items,
      subTotal: subTotal || 0,
      billDiscount: billDiscount || 0,
      note: note || ''
    });
    res.status(201).json(held);
  } catch (error) {
    res.status(500).json({ message: 'Error holding bill', error: error.message });
  }
});

router.delete('/hold/:id', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    await models.HeldBill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Held bill resumed/cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting held bill', error: error.message });
  }
});

export default router;
