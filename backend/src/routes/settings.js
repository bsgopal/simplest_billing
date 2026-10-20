import express from 'express';
import { getTenantDb } from '../config/tenantConnectionManager.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    let settings = await models.ShopSetting.findOne();
    if (!settings) {
      settings = await models.ShopSetting.create({});
    }

    const obj = settings.toObject();
    const userRole = String(req.user?.role || '').toLowerCase();
    const isPrivileged = ['owner', 'admin'].includes(userRole);
    if (!isPrivileged) {
      obj.withoutGstPassword = '••••••';
    }

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching settings', error: error.message });
  }
});

// Update settings - ONLY Owner and Admin allowed
router.put('/', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const models = getTenantDb(req.customerCode);
    let settings = await models.ShopSetting.findOne();
    if (!settings) {
      settings = await models.ShopSetting.create(req.body);
    } else {
      // Don't overwrite password with masked bullets
      if (req.body.withoutGstPassword === '••••••') {
        delete req.body.withoutGstPassword;
      }
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.json({ message: 'Settings saved successfully', settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
});

// Verify secret password to toggle Without-GST billing format on POS
router.post('/verify-without-gst-password', protect, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const models = getTenantDb(req.customerCode);
    const settings = await models.ShopSetting.findOne();
    const correctPassword = settings?.withoutGstPassword || '123456';

    const cleanInput = String(password).trim();
    if (cleanInput === String(correctPassword).trim()) {
      return res.json({
        success: true,
        verified: true,
        message: 'Without-GST Mode Authorized'
      });
    }

    // Also check if admin entered their master password / PIN
    const reqRole = String(req.user?.role || '').toLowerCase();
    if (['owner', 'admin'].includes(reqRole)) {
      if (cleanInput === '123456' || cleanInput === '1234' || cleanInput === 'admin') {
        return res.json({
          success: true,
          verified: true,
          message: 'Without-GST Mode Authorized (Master Pass)'
        });
      }
    }

    return res.status(401).json({
      success: false,
      verified: false,
      message: 'Incorrect Without-GST secret password'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
