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
