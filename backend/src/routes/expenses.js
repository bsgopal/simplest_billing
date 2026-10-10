import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const models = getTenantDb(req.customerCode);

    const query = {};
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const e = new Date(date);
      e.setHours(23, 59, 59, 999);
      query.date = { $gte: d, $lte: e };
    }

    const expenses = await models.Expense.find(query).sort({ date: -1 });
    const totalToday = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    res.json({ expenses, totalToday });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { category, description, amount, mode, date } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const models = getTenantDb(req.customerCode);
    const exp = await models.Expense.create({
      category: category || 'Other',
      description: description || '',
      amount: parseFloat(amount),
      mode: mode || 'Cash',
      date: date ? new Date(date) : new Date(),
      recordedBy: req.user.name
    });

    res.status(201).json(exp);
  } catch (error) {
    res.status(500).json({ message: 'Error adding expense', error: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    await models.Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense', error: error.message });
  }
});

router.get('/categories', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const categories = await models.Expense.distinct('category');
    res.json(categories.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expense categories', error: error.message });
  }
});

export default router;
