import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Item from '../models/Item.js';
import Bill from '../models/Bill.js';
import HeldBill from '../models/HeldBill.js';
import Customer from '../models/Customer.js';
import CustomerLedger from '../models/CustomerLedger.js';
import Supplier from '../models/Supplier.js';
import Purchase from '../models/Purchase.js';
import Expense from '../models/Expense.js';
import DayClose from '../models/DayClose.js';
import ShopSetting from '../models/ShopSetting.js';
import AuditLog from '../models/AuditLog.js';
import Client from '../models/Client.js';
import Category from '../models/Category.js';

const baseModels = {
  User,
  Item,
  Bill,
  HeldBill,
  Customer,
  CustomerLedger,
  Supplier,
  Purchase,
  Expense,
  DayClose,
  ShopSetting,
  AuditLog,
  Client,
  Category
};

const schemaRegistry = new Map();
for (const [name, model] of Object.entries(baseModels)) {
  if (model && model.schema) {
    schemaRegistry.set(name, model.schema);
  }
}

const bootstrappedTenants = new Set();

export function getTenantDb(customerCode) {
  let cleanCode = (customerCode || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanCode || cleanCode === 'default' || cleanCode === 'localhost' || cleanCode === '127001') {
    cleanCode = 'default';
  }

  // Renic SaaS convention: renic_tenant_<customercode>
  const targetDb = cleanCode === 'default' ? 'simple_billing' : `renic_tenant_${cleanCode}`;
  const tenantConn = mongoose.connection.useDb(targetDb, { useCache: true });

  const models = {};
  for (const [name, schema] of schemaRegistry.entries()) {
    models[name] = tenantConn.models[name] || tenantConn.model(name, schema);
  }

  // Seed default owner PIN & walk-in customer on first tenant load
  if (!bootstrappedTenants.has(targetDb)) {
    bootstrappedTenants.add(targetDb);
    bootstrapTenantDefaults(models, cleanCode).catch(err => {
      console.error(`[Tenant Bootstrap Error] ${targetDb}:`, err.message);
    });
  }

  return models;
}

export async function ensureTenantBootstrapped(customerCode) {
  const models = getTenantDb(customerCode);
  const cleanCode = (customerCode || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'default';
  await bootstrapTenantDefaults(models, cleanCode);
  return models;
}

async function bootstrapTenantDefaults(models, code) {
  try {
    // 1. Ensure at least 1 owner user exists with mobile 9842512143, password 123456, and PIN 1234
    const userCount = await models.User.countDocuments();
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash('1234', salt);
    const hashedPassword = await bcrypt.hash('123456', salt);

    if (userCount === 0) {
      await models.User.create({
        name: 'Shop Owner',
        mobile: '9842512143',
        password: hashedPassword,
        pin: hashedPin,
        role: 'owner',
        isActive: true
      });
      console.log(`[Tenant ${code}] Initial Owner provisioned (Mobile: 9842512143, Pass: 123456, PIN: 1234)`);
    } else {
      // Ensure existing owner has mobile and password
      const owner = await models.User.findOne({ role: { $in: ['owner', 'admin'] } });
      if (owner && (!owner.password || !owner.mobile)) {
        if (!owner.mobile) owner.mobile = '9842512143';
        if (!owner.password) owner.password = hashedPassword;
        if (!owner.pin) owner.pin = hashedPin;
        await owner.save();
        console.log(`[Tenant ${code}] Updated existing Owner with default credentials`);
      }
    }

    // 2. Ensure Walk-in customer exists
    const walkIn = await models.Customer.findOne({ name: 'Walk-in Customer' });
    if (!walkIn) {
      await models.Customer.create({
        name: 'Walk-in Customer',
        phone: '',
        creditLimit: 0,
        balanceDue: 0
      });
    }

    // 3. Ensure default ShopSettings exist
    const settingCount = await models.ShopSetting.countDocuments();
    if (settingCount === 0) {
      await models.ShopSetting.create({
        shopName: code === 'default' ? 'Simple Retail Store' : `Shop ${code.toUpperCase()}`,
        ownerName: 'Owner',
        phone: '9842512143',
        address: 'Main Bazaar',
        shopType: 'petti',
        chargeGst: false,
        priceIncludesGst: true,
        paperSize: '80mm',
        headerLines: ['Fresh Quality Products', 'Phone: 9842512143'],
        footerMessage: 'Thank you! Visit again!'
      });
    }
  } catch (err) {
    console.error('Error bootstrapping tenant defaults:', err);
  }
}
