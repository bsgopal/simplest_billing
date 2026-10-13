import mongoose from 'mongoose';

const shopSettingSchema = new mongoose.Schema({
  shopName: { type: String, default: 'My Retail Shop' },
  ownerName: { type: String, default: 'Owner' },
  phone: { type: String, default: '9876543210' },
  address: { type: String, default: 'Main Road' },
  shopType: { type: String, enum: ['petti', 'vegetable', 'departmental', 'general'], default: 'petti' },
  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  defaultLanguage: { type: String, default: 'ta' },
  phoneticEnabled: { type: Boolean, default: true },
  chargeGst: { type: Boolean, default: false },
  gstin: { type: String, default: '' },
  priceIncludesGst: { type: Boolean, default: true },
  defaultGstRate: { type: Number, default: 0 },
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
