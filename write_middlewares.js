import fs from 'fs';
import path from 'path';

const root = 'd:/Development/Simple_Billing/backend';

function write(relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[Created]: ${relPath}`);
}

// 1. tenantContext.js
write('src/middleware/tenantContext.js', `
import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

export function runWithTenant(customerCode, callback) {
  return asyncLocalStorage.run({ customerCode: (customerCode || 'default').toLowerCase() }, callback);
}

export function getCurrentTenantCode() {
  const store = asyncLocalStorage.getStore();
  return store?.customerCode || 'default';
}

export default {
  runWithTenant,
  getCurrentTenantCode
};
`);

// 2. tenantConnectionManager.js
write('src/config/tenantConnectionManager.js', `
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
  Client
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
  const targetDb = cleanCode === 'default' ? 'simple_billing' : \`renic_tenant_\${cleanCode}\`;
  const tenantConn = mongoose.connection.useDb(targetDb, { useCache: true });

  const models = {};
  for (const [name, schema] of schemaRegistry.entries()) {
    models[name] = tenantConn.models[name] || tenantConn.model(name, schema);
  }

  // Seed default owner PIN & walk-in customer on first tenant load
  if (!bootstrappedTenants.has(targetDb)) {
    bootstrappedTenants.add(targetDb);
    bootstrapTenantDefaults(models, cleanCode).catch(err => {
      console.error(\`[Tenant Bootstrap Error] \${targetDb}:\`, err.message);
    });
  }

  return models;
}

async function bootstrapTenantDefaults(models, code) {
  try {
    // 1. Ensure at least 1 owner user exists with PIN 1234
    const userCount = await models.User.countDocuments();
    if (userCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash('1234', salt);
      await models.User.create({
        name: 'Shop Owner',
        pin: hashedPin,
        role: 'owner',
        isActive: true
      });
      console.log(\`[Tenant \${code}] Initial Owner provisioned (PIN: 1234)\`);
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
        shopName: code === 'default' ? 'Simple Retail Store' : \`Shop \${code.toUpperCase()}\`,
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

    // 4. Sample quick items for petti & grocery store if empty
    const itemCount = await models.Item.countDocuments();
    if (itemCount === 0) {
      const sampleItems = [
        { name: 'Tomato', code: '101', category: 'Vegetables', unit: 'kg', allowDecimals: true, purchasePrice: 28, sellingPrice: 38, isQuickItem: true, currentStock: 35 },
        { name: 'Onion', code: '102', category: 'Vegetables', unit: 'kg', allowDecimals: true, purchasePrice: 25, sellingPrice: 32, isQuickItem: true, currentStock: 50 },
        { name: 'Potato', code: '103', category: 'Vegetables', unit: 'kg', allowDecimals: true, purchasePrice: 22, sellingPrice: 30, isQuickItem: true, currentStock: 40 },
        { name: 'Sugar 1kg', code: '201', category: 'Grocery', unit: 'packet', allowDecimals: false, purchasePrice: 40, sellingPrice: 46, isQuickItem: true, currentStock: 25 },
        { name: 'Milk 500ml', code: '301', category: 'Dairy', unit: 'packet', allowDecimals: false, purchasePrice: 24, sellingPrice: 28, isQuickItem: true, currentStock: 30 },
        { name: 'Tea Dust 250g', code: '202', category: 'Grocery', unit: 'packet', allowDecimals: false, purchasePrice: 70, sellingPrice: 85, isQuickItem: true, currentStock: 15 },
        { name: 'Biscuit Packet', code: '401', category: 'Snacks', unit: 'pcs', allowDecimals: false, purchasePrice: 8, sellingPrice: 10, isQuickItem: true, currentStock: 60 }
      ];
      await models.Item.insertMany(sampleItems);
      console.log(\`[Tenant \${code}] Sample retail items seeded\`);
    }
  } catch (err) {
    console.error('Error bootstrapping tenant defaults:', err);
  }
}
`);

// 3. tenantResolver.js
write('src/middleware/tenantResolver.js', `
import jwt from 'jsonwebtoken';
import { runWithTenant } from './tenantContext.js';

const JWT_SECRET = process.env.JWT_SECRET || 'SimpleBilling_Secure_Key_2026_Retail';
const APP_SLUGS = new Set(['billing', 'retail', 'pos', 'petti', 'pb', 'challan', 'wa', 'hq', 'api']);

function resolveCodeFromHost(rawHost) {
  const host = String(rawHost || '').split(':')[0].toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') return 'default';

  const parts = host.split('.').filter(Boolean);
  if (parts.length >= 3 && APP_SLUGS.has(parts[0])) {
    return parts[1];
  }
  if (parts.length >= 2 && !APP_SLUGS.has(parts[0])) {
    return parts[0];
  }
  return 'default';
}

export function tenantResolver(req, res, next) {
  let customerCode = '';

  // 1. Explicit header
  if (req.headers['x-customer-code']) {
    customerCode = req.headers['x-customer-code'].toString().trim().toLowerCase();
  }

  // 2. Query param (dev/testing)
  if (!customerCode && req.query?.tenant) {
    customerCode = req.query.tenant.toString().trim().toLowerCase();
  }

  // 3. Bearer Token payload
  if (!customerCode && req.headers.authorization?.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded?.customerCode) {
        customerCode = decoded.customerCode.toString().trim().toLowerCase();
      }
    } catch (e) {
      // Token expired or invalid — ignore here, auth middleware handles it
    }
  }

  // 4. Host header subdomain
  if (!customerCode) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    customerCode = resolveCodeFromHost(host);
  }

  if (!customerCode) customerCode = 'default';

  req.customerCode = customerCode;
  res.setHeader('X-Resolved-Tenant', customerCode);

  runWithTenant(customerCode, () => {
    next();
  });
}
`);

// 4. auth.js
write('src/middleware/auth.js', `
import jwt from 'jsonwebtoken';
import { getTenantDb } from '../config/tenantConnectionManager.js';

const JWT_SECRET = process.env.JWT_SECRET || 'SimpleBilling_Secure_Key_2026_Retail';

export const protect = async (req, res, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { User } = getTenantDb(req.customerCode);
    const user = await User.findById(decoded.id).select('-pin');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or account deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expired or invalid token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: \`Role '\${req.user?.role}' is not authorized to perform this action\`
      });
    }
    next();
  };
};
`);

// 5. license.js
write('src/middleware/license.js', `
export const checkLicense = (req, res, next) => {
  // Simple billing is always active for valid tenants
  next();
};
`);

console.log('Middlewares written successfully');
