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
