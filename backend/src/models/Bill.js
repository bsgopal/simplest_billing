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
