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
