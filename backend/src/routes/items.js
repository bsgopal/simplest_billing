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

    const cleanName = String(name || '').trim();
    const cleanCategory = String(category || '').trim();
    const cleanUnit = String(unit || '').trim();

    if (!cleanName || !cleanCategory || cleanCategory.toLowerCase() === 'all' || !cleanUnit || sellingPrice === undefined || sellingPrice === '') {
      return res.status(400).json({ message: 'Product Name, Category, Unit, and Selling Price are required' });
    }

    const models = getTenantDb(req.customerCode);

    let itemCode = code;
    if (!itemCode) {
      const count = await models.Item.countDocuments();
      itemCode = String(100 + count + 1);
    }

    const item = await models.Item.create({
      name: cleanName,
      translations: translations || {},
      code: itemCode,
      barcode: barcode ? barcode.trim() : '',
      barcodes: barcode ? [barcode.trim()] : [],
      category: cleanCategory,
      unit: cleanUnit,
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

    res.json({
      message: 'Stock inwarded successfully',
      item: updatedItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Error inwarding stock', error: error.message });
  }
});

// Bulk Commit Scanned Barcodes to Items (1 stock per unique barcode)
router.post('/bulk-barcode-inward', protect, async (req, res) => {
  try {
    const { items: scanList } = req.body;
    if (!Array.isArray(scanList) || scanList.length === 0) {
      return res.status(400).json({ message: 'No scanned items provided to commit' });
    }

    const models = getTenantDb(req.customerCode);
    const updatedItems = [];
    const skippedBarcodes = [];

    // Group scanned barcodes by itemId
    const grouped = {};
    for (const entry of scanList) {
      const { itemId, barcode } = entry;
      const cleanBarcode = barcode ? barcode.trim() : '';
      if (!itemId || !cleanBarcode) continue;

      if (!grouped[itemId]) {
        grouped[itemId] = {
          itemId,
          barcodes: new Set(),
          costPrice: entry.costPrice,
          sellingPrice: entry.sellingPrice
        };
      }
      grouped[itemId].barcodes.add(cleanBarcode);
    }

    for (const grp of Object.values(grouped)) {
      const item = await models.Item.findById(grp.itemId);
      if (!item) continue;

      const barcodesToAdd = Array.from(grp.barcodes);
      const qtyToAdd = barcodesToAdd.length; // 1 stock per unique scanned barcode

      const updateOps = {
        $inc: { currentStock: qtyToAdd },
        $addToSet: { barcodes: { $each: barcodesToAdd } }
      };

      if (!item.barcode && barcodesToAdd.length > 0) {
        updateOps.$set = { barcode: barcodesToAdd[0] };
      }

      if (grp.costPrice !== undefined && grp.costPrice !== '') {
        updateOps.$set = { ...(updateOps.$set || {}), purchasePrice: parseFloat(grp.costPrice) || 0 };
      }
      if (grp.sellingPrice !== undefined && grp.sellingPrice !== '') {
        updateOps.$set = { ...(updateOps.$set || {}), sellingPrice: parseFloat(grp.sellingPrice) || 0 };
      }

      const updated = await models.Item.findByIdAndUpdate(grp.itemId, updateOps, { new: true });
      updatedItems.push(updated);

      await models.AuditLog.create({
        action: 'BULK_STOCK_INWARD_BARCODE',
        entity: 'Item',
        entityId: grp.itemId,
        details: {
          itemName: item.name,
          barcodesAdded: barcodesToAdd,
          quantityAdded: qtyToAdd,
          newStock: updated.currentStock
        },
        performedBy: req.user.name
      });
    }

    res.json({
      message: `Successfully inwarded ${scanList.length} items to inventory!`,
      items: updatedItems,
      skipped: skippedBarcodes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error committing bulk stock inward', error: error.message });
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

    // Dynamic units unified from settings and all items in DB (not hardcoded/enum)
    const itemUnits = await models.Item.distinct('unit', { isActive: true });
    const configuredUnits = (settings?.units && settings.units.length > 0) ? settings.units : [
      { name: 'pcs', allowDecimals: false },
      { name: 'kg', allowDecimals: true },
      { name: 'gram', allowDecimals: false },
      { name: 'packet', allowDecimals: false },
      { name: 'bottle', allowDecimals: false },
      { name: 'box', allowDecimals: false },
      { name: 'litre', allowDecimals: true },
      { name: 'meter', allowDecimals: true }
    ];

    const unitMap = new Map();
    configuredUnits.forEach(u => unitMap.set(u.name.toLowerCase(), u));
    (itemUnits || []).forEach(uName => {
      if (uName && !unitMap.has(uName.toLowerCase())) {
        unitMap.set(uName.toLowerCase(), {
          name: uName,
          allowDecimals: ['kg', 'litre', 'meter', 'gram'].includes(uName.toLowerCase())
        });
      }
    });

    res.json({
      categories: allCategories,
      categoryDetails: categoryDocs,
      units: Array.from(unitMap.values())
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories and units', error: error.message });
  }
});

// Create/Register a new custom unit (Dynamic, not an enum)
router.post('/units', protect, async (req, res) => {
  try {
    const { name, allowDecimals = false } = req.body;
    const cleanName = String(name || '').trim().toLowerCase();
    if (!cleanName) {
      return res.status(400).json({ message: 'Unit name is required' });
    }

    const models = getTenantDb(req.customerCode);
    let settings = await models.ShopSetting.findOne();
    if (!settings) {
      settings = await models.ShopSetting.create({});
    }

    const exists = (settings.units || []).some(u => u.name.toLowerCase() === cleanName);
    if (!exists) {
      settings.units.push({ name: cleanName, allowDecimals: Boolean(allowDecimals) });
      await settings.save();
    }

    res.json({
      message: 'Unit saved successfully',
      unit: { name: cleanName, allowDecimals: Boolean(allowDecimals) },
      units: settings.units
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saving unit', error: error.message });
  }
});

// Delete a custom unit
router.delete('/units/:name', protect, async (req, res) => {
  try {
    const unitName = decodeURIComponent(req.params.name).trim().toLowerCase();
    const models = getTenantDb(req.customerCode);
    let settings = await models.ShopSetting.findOne();
    if (settings && settings.units) {
      settings.units = settings.units.filter(u => u.name.toLowerCase() !== unitName);
      await settings.save();
    }
    res.json({ message: `Unit ${unitName} removed`, units: settings?.units || [] });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting unit', error: error.message });
  }
});

export default router;
