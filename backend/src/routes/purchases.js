import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const purchases = await models.Purchase.find().sort({ date: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchases', error: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { supplierId, supplierBillNo, items, paidNow = 0, updateItemRates = true, notes } = req.body;
    if (!supplierId || !items || !items.length) {
      return res.status(400).json({ message: 'Supplier and at least 1 item are required' });
    }

    const models = getTenantDb(req.customerCode);
    const supplier = await models.Supplier.findById(supplierId);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    let totalAmount = 0;
    const processedItems = items.map(item => {
      const amt = (parseFloat(item.qty) || 0) * (parseFloat(item.costRate) || 0);
      totalAmount += amt;
      return {
        itemId: item.itemId,
        name: item.name,
        qty: parseFloat(item.qty),
        unit: item.unit,
        costRate: parseFloat(item.costRate),
        sellRate: parseFloat(item.sellRate) || 0,
        amount: amt
      };
    });

    const paid = parseFloat(paidNow) || 0;
    const balanceDue = Math.max(0, totalAmount - paid);

    const count = await models.Purchase.countDocuments();
    const purchaseNo = `P-${String(count + 1).padStart(4, '0')}`;

    const purchase = await models.Purchase.create({
      purchaseNo,
      supplierId: supplier._id,
      supplierName: supplier.name,
      supplierBillNo: supplierBillNo || '',
      date: new Date(),
      items: processedItems,
      totalAmount,
      paidAmount: paid,
      balanceDue,
      notes: notes || ''
    });

    for (const item of processedItems) {
      const updateData = { $inc: { currentStock: item.qty } };
      if (updateItemRates) {
        updateData.$set = { purchasePrice: item.costRate };
        if (item.sellRate > 0) updateData.$set.sellingPrice = item.sellRate;
      }
      if (item.itemId) {
        await models.Item.findByIdAndUpdate(item.itemId, updateData);
      }
    }

    if (balanceDue > 0) {
      supplier.balanceDue = (supplier.balanceDue || 0) + balanceDue;
      await supplier.save();
    }

    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Error creating purchase', error: error.message });
  }
});

export default router;
