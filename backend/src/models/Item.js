import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  translations: {
    ta: { type: String, trim: true, default: '' }, // Tamil
    hi: { type: String, trim: true, default: '' }, // Hindi
    te: { type: String, trim: true, default: '' }, // Telugu
    kn: { type: String, trim: true, default: '' }, // Kannada
    ml: { type: String, trim: true, default: '' }  // Malayalam
  },
  code: { type: String, trim: true }, // e.g. "101"
  barcode: { type: String, trim: true, index: true },
  barcodes: [{ type: String, trim: true }], // Supports multiple barcodes / QR codes mapped to one item
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

itemSchema.index({ name: 'text', code: 'text', barcode: 'text', 'translations.ta': 'text', 'translations.hi': 'text', 'translations.te': 'text', 'translations.kn': 'text', 'translations.ml': 'text' });

export default mongoose.models.Item || mongoose.model('Item', itemSchema);
