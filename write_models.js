import fs from 'fs';
import path from 'path';

const root = 'd:/Development/Simple_Billing/backend';

function write(relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[Created]: ${relPath}`);
}

// Client.js
write('src/models/Client.js', `
import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gstNumber: { type: String, default: '' },
  address: { type: String, default: '' },
  contact: { type: String, default: '' },
  licenseKey: { type: String, unique: true, sparse: true },
  licenseStatus: {
    type: String,
    enum: ['trial', 'active', 'grace_period', 'locked', 'cancelled', 'pending_activation'],
    default: 'active'
  },
  licenseStart: { type: Date, default: Date.now },
  licenseEnd: { type: Date, default: () => new Date(Date.now() + 365*24*60*60*1000) },
  customerCode: { type: String, sparse: true, uppercase: true, trim: true, index: true },
  shopSlug: { type: String, lowercase: true, trim: true, default: '' },
  softwareProduct: { type: String, default: 'SIMPLE_BILLING' },
  shopType: { type: String, enum: ['petti', 'vegetable', 'departmental', 'general'], default: 'petti' }
}, { timestamps: true });

export default mongoose.models.Client || mongoose.model('Client', clientSchema);
`);

// User.js
write('src/models/User.js', `
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  pin: { type: String, required: true }, // 4-6 digit hashed PIN
  role: { type: String, enum: ['owner', 'cashier', 'stock_keeper'], default: 'cashier' },
  mobile: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
`);

// Item.js
write('src/models/Item.js', `
import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true }, // e.g. "101"
  barcode: { type: String, trim: true, index: true },
  category: { type: String, default: 'General', trim: true },
  unit: { type: String, required: true, default: 'pcs' }, // kg, gram, pcs, packet, dozen, litre, ml, box, bunch
  allowDecimals: { type: Boolean, default: false },
  purchasePrice: { type: Number, default: 0, min: 0 },
  mrp: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  allowRateChange: { type: Boolean, default: false },
  hsn: { type: String, default: '' },
  gstPercent: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  lowStockLevel: { type: Number, default: 5 },
  isQuickItem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

itemSchema.index({ name: 'text', code: 'text', barcode: 'text' });

export default mongoose.models.Item || mongoose.model('Item', itemSchema);
`);

// Bill.js
write('src/models/Bill.js', `
import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 0.001 },
  unit: { type: String, required: true },
  rate: { type: Number, required: true, min: 0 },
  lineDiscount: { type: Number, default: 0, min: 0 },
  amount: { type: Number, required: true },
  purchasePrice: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 0 },
  hsn: { type: String, default: '' }
}, { _id: false });

const billSchema = new mongoose.Schema({
  billNo: { type: String, required: true, unique: true, index: true },
  billSequence: { type: Number, required: true, index: true },
  date: { type: Date, default: Date.now, index: true },
  customer: {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    name: { type: String, default: 'Walk-in Customer' },
    phone: { type: String, default: '' }
  },
  items: [billItemSchema],
  subTotal: { type: Number, required: true },
  billDiscount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  payments: {
    cash: { type: Number, default: 0 },
    upi: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    credit: { type: Number, default: 0 }
  },
  receivedAmount: { type: Number, default: 0 },
  changeReturned: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Paid', 'Credit', 'Cancelled', 'Returned'],
    default: 'Paid',
    index: true
  },
  cancelReason: { type: String, default: '' },
  cancelledBy: { type: String, default: '' },
  cancelledAt: { type: Date },
  notes: { type: String, default: '' },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cashierName: { type: String, default: 'Owner' }
}, { timestamps: true });

export default mongoose.models.Bill || mongoose.model('Bill', billSchema);
`);

// HeldBill.js
write('src/models/HeldBill.js', `
import mongoose from 'mongoose';

const heldBillSchema = new mongoose.Schema({
  customerName: { type: String, default: 'Walk-in' },
  customerPhone: { type: String, default: '' },
  items: { type: Array, default: [] },
  subTotal: { type: Number, default: 0 },
  billDiscount: { type: Number, default: 0 },
  heldAt: { type: Date, default: Date.now },
  note: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.models.HeldBill || mongoose.model('HeldBill', heldBillSchema);
`);

// Customer.js
write('src/models/Customer.js', `
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  address: { type: String, default: '' },
  creditLimit: { type: Number, default: 0 }, // 0 = unlimited
  balanceDue: { type: Number, default: 0 },  // Udhar amount owed to shop
  openingBalance: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);
`);

// CustomerLedger.js
write('src/models/CustomerLedger.js', `
import mongoose from 'mongoose';

const customerLedgerSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  date: { type: Date, default: Date.now, index: true },
  type: { type: String, enum: ['Bill', 'Payment', 'Return', 'Opening'], required: true },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  billNo: { type: String, default: '' },
  particulars: { type: String, required: true },
  debit: { type: Number, default: 0 },  // Bill amount added to balance
  credit: { type: Number, default: 0 }, // Payment received reducing balance
  balance: { type: Number, required: true },
  mode: { type: String, default: 'Cash' }, // Cash, UPI, Card
  note: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.models.CustomerLedger || mongoose.model('CustomerLedger', customerLedgerSchema);
`);

// Supplier.js
write('src/models/Supplier.js', `
import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  gstin: { type: String, default: '' },
  balanceDue: { type: Number, default: 0 }, // Amount we owe to supplier
  openingBalance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
`);

// Purchase.js
write('src/models/Purchase.js', `
import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  unit: { type: String, required: true },
  costRate: { type: Number, required: true },
  sellRate: { type: Number, default: 0 },
  amount: { type: Number, required: true }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  purchaseNo: { type: String, required: true, unique: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: { type: String, required: true },
  supplierBillNo: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  items: [purchaseItemSchema],
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
`);

// Expense.js
write('src/models/Expense.js', `
import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, index: true },
  category: {
    type: String,
    enum: ['Rent', 'Salary', 'Electricity', 'Transport', 'Tea/Food', 'Packing', 'Repair', 'Other'],
    default: 'Other'
  },
  description: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0.01 },
  mode: { type: String, enum: ['Cash', 'UPI', 'Bank'], default: 'Cash' },
  recordedBy: { type: String, default: 'Owner' }
}, { timestamps: true });

export default mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
`);

// DayClose.js
write('src/models/DayClose.js', `
import mongoose from 'mongoose';

const dayCloseSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, unique: true, index: true },
  openingCash: { type: Number, default: 0 },
  cashSales: { type: Number, default: 0 },
  creditPaymentsReceived: { type: Number, default: 0 },
  cashExpenses: { type: Number, default: 0 },
  cashRefunds: { type: Number, default: 0 },
  cashPaidToSuppliers: { type: Number, default: 0 },
  expectedCash: { type: Number, required: true },
  actualCashCounted: { type: Number, required: true },
  difference: { type: Number, required: true },
  note: { type: String, default: '' },
  upiSales: { type: Number, default: 0 },
  cardSales: { type: Number, default: 0 },
  creditSales: { type: Number, default: 0 },
  totalBills: { type: Number, default: 0 },
  closedBy: { type: String, default: 'Owner' },
  closedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.DayClose || mongoose.model('DayClose', dayCloseSchema);
`);

// ShopSetting.js
write('src/models/ShopSetting.js', `
import mongoose from 'mongoose';

const shopSettingSchema = new mongoose.Schema({
  shopName: { type: String, default: 'My Retail Shop' },
  ownerName: { type: String, default: 'Owner' },
  phone: { type: String, default: '9876543210' },
  address: { type: String, default: 'Main Road' },
  shopType: { type: String, enum: ['petti', 'vegetable', 'departmental', 'general'], default: 'petti' },
  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  chargeGst: { type: Boolean, default: false },
  gstin: { type: String, default: '' },
  priceIncludesGst: { type: Boolean, default: true },
  paperSize: { type: String, enum: ['58mm', '80mm', 'A4'], default: '80mm' },
  billPrefix: { type: String, default: 'BILL-' },
  headerLines: { type: [String], default: ['Welcome to our store'] },
  footerMessage: { type: String, default: 'Thank you! Visit again!' },
  showLogo: { type: Boolean, default: true },
  autoPrint: { type: Boolean, default: false },
  roundOff: { type: Boolean, default: true },
  allowRateChange: { type: Boolean, default: false },
  allowCashierDiscount: { type: Boolean, default: true },
  maxCashierDiscount: { type: Number, default: 10 },
  allowNegativeStock: { type: Boolean, default: true },
  trackStock: { type: Boolean, default: true },
  lowStockAlert: { type: Boolean, default: true },
  categories: {
    type: [String],
    default: ['Vegetables', 'Fruits', 'Grocery', 'Snacks', 'Beverages', 'Dairy', 'General']
  },
  units: {
    type: [
      {
        name: { type: String },
        allowDecimals: { type: Boolean, default: false }
      }
    ],
    default: [
      { name: 'kg', allowDecimals: true },
      { name: 'gram', allowDecimals: false },
      { name: 'pcs', allowDecimals: false },
      { name: 'packet', allowDecimals: false },
      { name: 'dozen', allowDecimals: false },
      { name: 'litre', allowDecimals: true },
      { name: 'ml', allowDecimals: false },
      { name: 'bunch', allowDecimals: false },
      { name: 'box', allowDecimals: false }
    ]
  }
}, { timestamps: true });

export default mongoose.models.ShopSetting || mongoose.model('ShopSetting', shopSettingSchema);
`);

// AuditLog.js
write('src/models/AuditLog.js', `
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  performedBy: { type: String, default: 'System' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
`);

console.log('All models created successfully');
