import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect, authorize } from '../middleware/auth.js';

import axios from 'axios';

const router = express.Router();

const itcMap = {
  ta: 'ta-t-i0-und',
  hi: 'hi-t-i0-und',
  te: 'te-t-i0-und',
  kn: 'kn-t-i0-und',
  ml: 'ml-t-i0-und'
};

async function transliterateText(text, lang) {
  if (!text || !lang || lang === 'en') return text;
  const itc = itcMap[lang];
  if (!itc) return text;
  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text.toLowerCase().trim())}&itc=${itc}&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;
    const res = await axios.get(url, { timeout: 3500 });
    if (res.data?.[0] === 'SUCCESS' && res.data[1]?.[0]?.[1]?.[0]) {
      return res.data[1][0][1][0];
    }
  } catch (err) {}
  return text;
}

// GET all categories for current tenant
router.get('/', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const { active = 'true', search = '' } = req.query;

    const query = {};
    if (active === 'true') query.isActive = true;
    if (search.trim()) {
      query.$or = [
        { name: new RegExp(search.trim(), 'i') },
        { 'translations.ta': new RegExp(search.trim(), 'i') },
        { 'translations.hi': new RegExp(search.trim(), 'i') },
        { 'translations.te': new RegExp(search.trim(), 'i') },
        { 'translations.kn': new RegExp(search.trim(), 'i') },
        { 'translations.ml': new RegExp(search.trim(), 'i') }
      ];
    }

    const categories = await models.Category.find(query).sort({ displayOrder: 1, name: 1 });

    // Count items per category dynamically
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const itemCount = await models.Item.countDocuments({
          category: cat.name,
          isActive: true
        });
        const obj = cat.toObject();
        obj.itemCount = itemCount;
        return obj;
      })
    );

    res.json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// GET single category
router.get('/:id', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const category = await models.Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category', error: error.message });
  }
});

// CREATE category
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, translations, icon, color, displayOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category Name is required' });
    }

    const models = getTenantDb(req.customerCode);
    let cleanName = name.trim();
    const activeLang = req.body.language || req.headers['x-language'] || 'en';

    // Auto-transliterate if active language is non-English and name has English letters
    if (activeLang !== 'en' && /[a-zA-Z]/.test(cleanName)) {
      const converted = await transliterateText(cleanName, activeLang);
      if (converted && converted !== cleanName) {
        cleanName = converted;
      }
    }

    // Check duplicate
    const existing = await models.Category.findOne({ 
      name: new RegExp(`^${cleanName}$`, 'i') 
    });
    if (existing) {
      return res.status(400).json({ message: `Category "${cleanName}" already exists` });
    }

    const autoTranslations = {
      ta: translations?.ta?.trim() || '',
      hi: translations?.hi?.trim() || '',
      te: translations?.te?.trim() || '',
      kn: translations?.kn?.trim() || '',
      ml: translations?.ml?.trim() || ''
    };

    if (activeLang !== 'en' && !autoTranslations[activeLang]) {
      autoTranslations[activeLang] = cleanName;
    }

    const category = await models.Category.create({
      name: cleanName,
      description: (description || '').trim(),
      translations: autoTranslations,
      icon: icon || 'Tag',
      color: color || '#84cc16',
      displayOrder: parseInt(displayOrder, 10) || 0,
      isActive: true
    });

    // Also sync to ShopSetting.categories array if missing
    await models.ShopSetting.findOneAndUpdate(
      {},
      { $addToSet: { categories: cleanName } },
      { upsert: true }
    );

    await models.AuditLog.create({
      action: 'CATEGORY_CREATE',
      entity: 'Category',
      entityId: category._id,
      details: { name: cleanName, translations: category.translations },
      performedBy: req.user.name
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
});

// UPDATE category
router.put('/:id', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const prev = await models.Category.findById(req.params.id);
    if (!prev) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const { name, description, translations, icon, color, displayOrder, isActive } = req.body;
    const cleanName = (name || prev.name).trim();

    const updated = await models.Category.findByIdAndUpdate(
      req.params.id,
      {
        name: cleanName,
        description: description !== undefined ? description.trim() : prev.description,
        translations: {
          ta: translations?.ta !== undefined ? translations.ta.trim() : prev.translations?.ta,
          hi: translations?.hi !== undefined ? translations.hi.trim() : prev.translations?.hi,
          te: translations?.te !== undefined ? translations.te.trim() : prev.translations?.te,
          kn: translations?.kn !== undefined ? translations.kn.trim() : prev.translations?.kn,
          ml: translations?.ml !== undefined ? translations.ml.trim() : prev.translations?.ml
        },
        icon: icon || prev.icon,
        color: color || prev.color,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : prev.displayOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : prev.isActive
      },
      { new: true }
    );

    // If name changed, optionally cascade update items
    if (prev.name !== cleanName) {
      await models.Item.updateMany(
        { category: prev.name },
        { $set: { category: cleanName } }
      );
      // Update ShopSetting.categories array
      await models.ShopSetting.findOneAndUpdate(
        {},
        { 
          $pull: { categories: prev.name },
          $addToSet: { categories: cleanName }
        }
      );
    }

    await models.AuditLog.create({
      action: 'CATEGORY_UPDATE',
      entity: 'Category',
      entityId: updated._id,
      details: { oldName: prev.name, newName: cleanName },
      performedBy: req.user.name
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
});

// DELETE category (Soft delete or delete if 0 items)
router.delete('/:id', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const category = await models.Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const itemsCount = await models.Item.countDocuments({ 
      category: category.name, 
      isActive: true 
    });

    if (itemsCount > 0) {
      // Reassign active items to 'General' so category can be safely deleted
      await models.Item.updateMany(
        { category: category.name },
        { $set: { category: 'General' } }
      );
      await models.ShopSetting.findOneAndUpdate(
        {},
        { $addToSet: { categories: 'General' } }
      );
    }

    await models.Category.findByIdAndDelete(req.params.id);
    await models.ShopSetting.findOneAndUpdate(
      {},
      { $pull: { categories: category.name } }
    );

    await models.AuditLog.create({
      action: 'CATEGORY_DELETE',
      entity: 'Category',
      entityId: category._id,
      details: { name: category.name },
      performedBy: req.user.name
    });

    res.json({ message: `Category "${category.name}" deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
});

export default router;
