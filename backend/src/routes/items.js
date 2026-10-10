import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { search, category, active = 'true', quickOnly } = req.query;
    const models = getTenantDb(req.customerCode);

    const query = {};
    if (active === 'true') query.isActive = true;
    if (quickOnly === 'true') query.isQuickItem = true;
    if (category && category !== 'All') query.category = category;

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { 'translations.ta': new RegExp(search, 'i') },
        { 'translations.hi': new RegExp(search, 'i') },
        { 'translations.te': new RegExp(search, 'i') },
        { 'translations.kn': new RegExp(search, 'i') },
        { 'translations.ml': new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { barcodes: new RegExp(search, 'i') }
      ];
    }

    const items = await models.Item.find(query).sort({ isQuickItem: -1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
});

router.get('/quick', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const quickItems = await models.Item.find({ isActive: true, isQuickItem: true }).sort({ name: 1 });
    res.json(quickItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quick items', error: error.message });
  }
});

router.get('/barcode/:barcode', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const barcode = req.params.barcode.trim();
    const item = await models.Item.findOne({
      isActive: true,
      $or: [
        { barcode: barcode },
        { code: barcode },
        { barcodes: barcode },
        { barcode: new RegExp(`^${barcode}$`, 'i') },
        { code: new RegExp(`^${barcode}$`, 'i') },
        { barcodes: new RegExp(`^${barcode}$`, 'i') }
      ]
    });
    if (!item) {
      return res.status(404).json({ message: 'Item not found for this barcode' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error looking up barcode', error: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const {
      name, translations, code, barcode, category, unit, allowDecimals,
      purchasePrice, mrp, sellingPrice, allowRateChange,
      hsn, gstPercent, openingStock, lowStockLevel, isQuickItem
    } = req.body;

    if (!name || !sellingPrice || !unit) {
      return res.status(400).json({ message: 'Name, Unit, and Selling Price are required' });
    }

    const models = getTenantDb(req.customerCode);

    let itemCode = code;
    if (!itemCode) {
      const count = await models.Item.countDocuments();
      itemCode = String(100 + count + 1);
    }

    const item = await models.Item.create({
      name,
      translations: translations || {},
      code: itemCode,
      barcode: barcode || itemCode,
      category: category || 'General',
      unit,
      allowDecimals: Boolean(allowDecimals || unit === 'kg' || unit === 'litre'),
      purchasePrice: parseFloat(purchasePrice) || 0,
      mrp: parseFloat(mrp) || 0,
      sellingPrice: parseFloat(sellingPrice),
      allowRateChange: Boolean(allowRateChange),
      hsn: hsn || '',
      gstPercent: parseFloat(gstPercent) || 0,
      currentStock: parseFloat(openingStock) || 0,
      lowStockLevel: parseFloat(lowStockLevel) || 5,
      isQuickItem: Boolean(isQuickItem),
      isActive: true
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const item = await models.Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
});

router.post('/stock-adjust', protect, async (req, res) => {
  try {
    const { itemId, type, quantity, reason, note } = req.body;
    if (!itemId || !quantity || !reason) {
      return res.status(400).json({ message: 'Item, Quantity, and Reason are required' });
    }

    const models = getTenantDb(req.customerCode);
    const qty = parseFloat(quantity);
    const incQty = type === 'Reduce' ? -qty : qty;

    const item = await models.Item.findByIdAndUpdate(
      itemId,
      { $inc: { currentStock: incQty } },
      { new: true }
    );

    await models.AuditLog.create({
      action: 'STOCK_ADJUSTMENT',
      entity: 'Item',
      entityId: itemId,
      details: { itemName: item.name, type, quantity: qty, reason, note, newStock: item.currentStock },
      performedBy: req.user.name
    });

    res.json({ message: 'Stock adjusted successfully', item });
  } catch (error) {
    res.status(500).json({ message: 'Error adjusting stock', error: error.message });
  }
});

// Link Barcode/QR to an Existing Item and Add Stock (Continuous Inwarding)
router.post('/link-barcode-stock', protect, async (req, res) => {
  try {
    const { itemId, barcode, quantity = 1, costPrice, sellingPrice, note } = req.body;
    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    const models = getTenantDb(req.customerCode);
    const item = await models.Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const qty = parseFloat(quantity) || 1;
    const cleanBarcode = barcode ? barcode.trim() : '';

    // If barcode is provided, link it to item.barcode (if empty) and to barcodes array
    const updateOps = {
      $inc: { currentStock: qty }
    };

    if (cleanBarcode) {
      if (!item.barcode) {
        updateOps.$set = { barcode: cleanBarcode };
      }
      updateOps.$addToSet = { barcodes: cleanBarcode };
    }

    if (costPrice !== undefined && costPrice !== '') {
      updateOps.$set = { ...(updateOps.$set || {}), purchasePrice: parseFloat(costPrice) || 0 };
    }
    if (sellingPrice !== undefined && sellingPrice !== '') {
      updateOps.$set = { ...(updateOps.$set || {}), sellingPrice: parseFloat(sellingPrice) || 0 };
    }

    const updatedItem = await models.Item.findByIdAndUpdate(itemId, updateOps, { new: true });

    await models.AuditLog.create({
      action: 'STOCK_INWARD_BARCODE',
      entity: 'Item',
      entityId: itemId,
      details: { 
        itemName: item.name, 
        barcode: cleanBarcode, 
        quantity: qty, 
        newStock: updatedItem.currentStock,
        note: note || 'Barcode linked & stock added' 
      },
      performedBy: req.user.name
    });

    res.json({ message: 'Barcode linked and stock added successfully', item: updatedItem });
  } catch (error) {
    res.status(500).json({ message: 'Error linking barcode and adding stock', error: error.message });
  }
});

router.get('/categories-units', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const settings = await models.ShopSetting.findOne();
    const itemCategories = await models.Item.distinct('category', { isActive: true });
    const categoryDocs = await models.Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    const dedicatedCategories = categoryDocs.map(c => c.name);

    // Dynamic categories unified from Category collection, items, and settings
    const allCategories = Array.from(new Set([
      ...dedicatedCategories,
      ...(itemCategories || []),
      ...(settings?.categories || [])
    ])).filter(Boolean);

    res.json({
      categories: allCategories,
      categoryDetails: categoryDocs,
      units: settings?.units && settings.units.length > 0 ? settings.units : [
        { name: 'pcs', allowDecimals: false },
        { name: 'kg', allowDecimals: true },
        { name: 'gram', allowDecimals: false },
        { name: 'packet', allowDecimals: false },
        { name: 'litre', allowDecimals: true }
      ]
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories and units', error: error.message });
  }
});

export default router;
