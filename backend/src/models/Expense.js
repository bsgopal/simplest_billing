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
