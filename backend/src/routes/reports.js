import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const todayBills = await models.Bill.find({
      date: { $gte: start, $lte: end },
      status: { $ne: 'Cancelled' }
    });

    let todaySales = 0, cashSales = 0, upiSales = 0, cardSales = 0, creditGiven = 0;
    for (const b of todayBills) {
      todaySales += (b.grandTotal || 0);
      cashSales += (b.payments?.cash || 0);
      upiSales += (b.payments?.upi || 0);
      cardSales += (b.payments?.card || 0);
      creditGiven += (b.payments?.credit || 0);
    }

    const todayExpenses = await models.Expense.find({
      date: { $gte: start, $lte: end }
    });
    const expensesTotal = todayExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    const lowStockItems = await models.Item.find({
      isActive: true,
      $expr: { $lte: ['$currentStock', '$lowStockLevel'] }
    }).limit(6);

    const pendingCreditCustomers = await models.Customer.find({
      isActive: true,
      balanceDue: { $gt: 0 }
    }).sort({ balanceDue: -1 }).limit(3);

    res.json({
      todaySales,
      billsCount: todayBills.length,
      cashInHand: cashSales,
      upiAndCard: upiSales + cardSales,
      creditGiven,
      expensesTotal,
      lowStockItems,
      pendingCreditCustomers
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard metrics', error: error.message });
  }
});

router.get('/sales', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const models = getTenantDb(req.customerCode);

    const query = { status: { $ne: 'Cancelled' } };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    const bills = await models.Bill.find(query).sort({ date: -1 });

    // Aggregate by day
    const dayMap = {};
    for (const b of bills) {
      const d = b.date.toISOString().split('T')[0];
      if (!dayMap[d]) {
        dayMap[d] = { date: d, bills: 0, sales: 0, discount: 0, netSales: 0 };
      }
      dayMap[d].bills += 1;
      dayMap[d].sales += (b.subTotal || 0);
      dayMap[d].discount += (b.billDiscount || 0);
      dayMap[d].netSales += (b.grandTotal || 0);
    }

    res.json({
      bills,
      dailySummary: Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating sales report', error: error.message });
  }
});

router.get('/summary', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const models = getTenantDb(req.customerCode);

    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    } else {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      dateFilter.$gte = d;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      dateFilter.$lte = e;
    } else {
      const e = new Date();
      e.setHours(23, 59, 59, 999);
      dateFilter.$lte = e;
    }

    const billQuery = {
      date: dateFilter,
      status: { $ne: 'Cancelled' }
    };

    const bills = await models.Bill.find(billQuery);

    let totalSales = 0;
    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;
    let creditSales = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let estimatedCost = 0;

    const itemAggregate = new Map();
    const slabAggregate = {
      '0%': { slab: '0%', taxable: 0, cgst: 0, sgst: 0, total: 0 },
      '5%': { slab: '5%', taxable: 0, cgst: 0, sgst: 0, total: 0 },
      '12%': { slab: '12%', taxable: 0, cgst: 0, sgst: 0, total: 0 },
      '18%': { slab: '18%', taxable: 0, cgst: 0, sgst: 0, total: 0 },
      '28%': { slab: '28%', taxable: 0, cgst: 0, sgst: 0, total: 0 }
    };

    for (const b of bills) {
      totalSales += (b.grandTotal || 0);
      cashSales += (b.payments?.cash || 0);
      upiSales += (b.payments?.upi || 0);
      cardSales += (b.payments?.card || 0);
      creditSales += (b.payments?.credit || 0);
      totalDiscounts += (b.billDiscount || 0);
      totalTax += (b.totalTax || 0);

      if (Array.isArray(b.items)) {
        for (const it of b.items) {
          const key = it.name || 'Unknown';
          const existing = itemAggregate.get(key) || { name: key, unit: it.unit || 'pcs', quantity: 0, totalAmount: 0 };
          existing.quantity += Number(it.quantity || 0);
          existing.totalAmount += Number(it.total || 0);
          itemAggregate.set(key, existing);

          if (it.costPrice) {
            estimatedCost += (it.costPrice * it.quantity);
          }

          const rate = Number(it.gstPercent || it.taxRate || 0);
          const slabKey = `${rate}%`;
          if (!slabAggregate[slabKey]) {
            slabAggregate[slabKey] = { slab: slabKey, taxable: 0, cgst: 0, sgst: 0, total: 0 };
          }
          const taxableVal = Number(it.total || 0);
          const taxVal = Number(it.taxAmount || 0);
          slabAggregate[slabKey].taxable += taxableVal;
          slabAggregate[slabKey].cgst += taxVal / 2;
          slabAggregate[slabKey].sgst += taxVal / 2;
          slabAggregate[slabKey].total += taxVal;
        }
      }
    }

    const expenses = await models.Expense.find({ date: dateFilter });
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    const expenseCategoryMap = {};
    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + (exp.amount || 0);
    }
    const expenseCategories = Object.entries(expenseCategoryMap).map(([category, total]) => ({ category, total }));

    const topItems = Array.from(itemAggregate.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    const estimatedProfit = Math.max(0, totalSales - estimatedCost - totalExpenses);

    res.json({
      summary: {
        totalSales: Number(totalSales.toFixed(2)),
        totalBills: bills.length,
        cashSales: Number(cashSales.toFixed(2)),
        upiSales: Number(upiSales.toFixed(2)),
        cardSales: Number(cardSales.toFixed(2)),
        creditSales: Number(creditSales.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        estimatedProfit: Number(estimatedProfit.toFixed(2)),
        totalDiscounts: Number(totalDiscounts.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2))
      },
      topItems,
      taxBreakdown: Object.values(slabAggregate),
      expenseCategories
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating summary report', error: error.message });
  }
});

router.get('/stock', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const items = await models.Item.find({ isActive: true }).sort({ currentStock: 1, name: 1 });
    
    let totalStockQty = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const it of items) {
      const stock = Number(it.currentStock || 0);
      totalStockQty += stock;
      totalCostValuation += (stock * Number(it.purchasePrice || 0));
      totalRetailValuation += (stock * Number(it.sellingPrice || 0));
      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= Number(it.lowStockLevel || 5)) {
        lowStockCount++;
      }
    }

    const recentMovements = await models.AuditLog.find({
      entity: 'Item'
    }).sort({ createdAt: -1 }).limit(30);

    res.json({
      summary: {
        totalItems: items.length,
        totalStockQty: Number(totalStockQty.toFixed(2)),
        totalCostValuation: Number(totalCostValuation.toFixed(2)),
        totalRetailValuation: Number(totalRetailValuation.toFixed(2)),
        lowStockCount,
        outOfStockCount
      },
      items,
      recentMovements
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating stock report', error: error.message });
  }
});

router.get('/customers', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const customers = await models.Customer.find({ isActive: true }).sort({ balanceDue: -1, name: 1 });
    
    let totalDue = 0;
    let customersWithDue = 0;

    for (const c of customers) {
      const due = Number(c.balanceDue || 0);
      totalDue += due;
      if (due > 0) customersWithDue++;
    }

    const recentLedger = await models.CustomerLedger.find()
      .populate('customerId', 'name phone')
      .sort({ date: -1 })
      .limit(50);

    res.json({
      summary: {
        totalCustomers: customers.length,
        totalDue: Number(totalDue.toFixed(2)),
        customersWithDue
      },
      customers,
      recentLedger
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating customer report', error: error.message });
  }
});

export default router;
