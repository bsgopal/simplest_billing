import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    const settings = await models.ShopSetting.findOne();
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error: error.message });
  }
});

router.put('/', protect, authorize('owner'), async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    let settings = await models.ShopSetting.findOne();
    if (!settings) {
      settings = await models.ShopSetting.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.json({ message: 'Settings saved successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
});

export default router;
