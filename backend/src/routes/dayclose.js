import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/current', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const lastClose = await models.DayClose.findOne().sort({ date: -1 });
    const openingCash = lastClose ? (lastClose.actualCashCounted || 0) : 0;

    const bills = await models.Bill.find({
      date: { $gte: start, $lte: end },
      status: { $ne: 'Cancelled' }
    });

    let cashSales = 0, upiSales = 0, cardSales = 0, creditSales = 0;
    for (const b of bills) {
      cashSales += (b.payments?.cash || 0);
      upiSales += (b.payments?.upi || 0);
      cardSales += (b.payments?.card || 0);
      creditSales += (b.payments?.credit || 0);
    }

    const custPayments = await models.CustomerLedger.find({
      date: { $gte: start, $lte: end },
      type: 'Payment',
      mode: 'Cash'
    });
    const creditCashReceived = custPayments.reduce((s, p) => s + (p.credit || 0), 0);

    const expenses = await models.Expense.find({
      date: { $gte: start, $lte: end },
      mode: 'Cash'
    });
    const cashExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    const expectedCash = (openingCash + cashSales + creditCashReceived) - cashExpenses;

    res.json({
      date: new Date(),
      openingCash,
      cashSales,
      creditCashReceived,
      cashExpenses,
      cashRefunds: 0,
      cashPaidToSuppliers: 0,
      expectedCash,
      upiSales,
      cardSales,
      creditSales,
      totalBills: bills.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating day close', error: error.message });
  }
});

router.post('/', protect, authorize('owner'), async (req, res) => {
  try {
    const { actualCashCounted, note } = req.body;
    const actual = parseFloat(actualCashCounted);
    if (isNaN(actual) || actual < 0) {
      return res.status(400).json({ message: 'Actual cash counted is required' });
    }

    const models = getTenantDb(req.customerCode);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const lastClose = await models.DayClose.findOne().sort({ date: -1 });
    const openingCash = lastClose ? (lastClose.actualCashCounted || 0) : 0;

    const bills = await models.Bill.find({
      date: { $gte: start, $lte: end },
      status: { $ne: 'Cancelled' }
    });

    let cashSales = 0, upiSales = 0, cardSales = 0, creditSales = 0;
    for (const b of bills) {
      cashSales += (b.payments?.cash || 0);
      upiSales += (b.payments?.upi || 0);
      cardSales += (b.payments?.card || 0);
      creditSales += (b.payments?.credit || 0);
    }

    const custPayments = await models.CustomerLedger.find({
      date: { $gte: start, $lte: end },
      type: 'Payment',
      mode: 'Cash'
    });
    const creditCashReceived = custPayments.reduce((s, p) => s + (p.credit || 0), 0);

    const expenses = await models.Expense.find({
      date: { $gte: start, $lte: end },
      mode: 'Cash'
    });
    const cashExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    const expectedCash = (openingCash + cashSales + creditCashReceived) - cashExpenses;
    const difference = actual - expectedCash;

    const record = await models.DayClose.create({
      date: new Date(),
      openingCash,
      cashSales,
      creditPaymentsReceived: creditCashReceived,
      cashExpenses,
      expectedCash,
      actualCashCounted: actual,
      difference,
      note: note || '',
      upiSales,
      cardSales,
      creditSales,
      totalBills: bills.length,
      closedBy: req.user.name,
      closedAt: new Date()
    });

    res.status(201).json({ message: 'Day closed and reconciled', dayClose: record });
  } catch (error) {
    res.status(500).json({ message: 'Error closing day', error: error.message });
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const history = await models.DayClose.find().sort({ date: -1 }).limit(30);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
});

export default router;
