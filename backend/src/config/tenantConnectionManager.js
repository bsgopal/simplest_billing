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

export function resolveTargetDbName(customerCode) {
  let cleanCode = (customerCode || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanCode || cleanCode === 'default' || cleanCode === 'localhost' || cleanCode === '127001') {
    return 'simple_billing';
  }

  // Strip any accidental duplicate prefixes (e.g. renic_tenant_ or simple_billing- / simple_billing_)
  const slug = cleanCode.replace(/^(renic_tenant_|simple_billing[-_])+/g, '');
  if (!slug) {
    return 'simple_billing';
  }

  // Desired convention for Simple Billing tenants: simple_billing-<customerid>
  return `simple_billing-${slug}`;
}

export function getTenantDb(customerCode) {
  const targetDb = resolveTargetDbName(customerCode);
  const tenantConn = mongoose.connection.useDb(targetDb, { useCache: true });

  const models = {};
  for (const [name, schema] of schemaRegistry.entries()) {
    models[name] = tenantConn.models[name] || tenantConn.model(name, schema);
  }

  return models;
}

export async function ensureTenantBootstrapped(customerCode) {
  const targetDb = resolveTargetDbName(customerCode);
  const models = getTenantDb(customerCode);
  const cleanCode = (customerCode || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'default';

  if (!bootstrappedTenants.has(targetDb)) {
    bootstrappedTenants.add(targetDb);
    await bootstrapTenantDefaults(models, cleanCode);
  }

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
        shopName: code === 'default' ? 'Retail Store' : `Store ${code.toUpperCase()}`,
        ownerName: 'Store Admin',
        phone: '',
        address: '',
        shopType: 'general',
        chargeGst: false,
        priceIncludesGst: true,
        paperSize: '80mm',
        headerLines: ['Welcome to our store'],
        footerMessage: 'Thank you! Visit again!'
      });
    }
  } catch (err) {
    console.error('Error bootstrapping tenant defaults:', err);
  }
}
