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
