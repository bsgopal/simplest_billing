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
