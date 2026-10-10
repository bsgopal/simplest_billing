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
