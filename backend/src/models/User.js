import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, default: '', trim: true, index: true },
  password: { type: String, default: '' }, // Hashed password for mobile+password login
  pin: { type: String, default: '' },      // 4-digit hashed PIN for quick cashier login
  role: { type: String, enum: ['owner', 'admin', 'manager', 'cashier', 'stock_keeper'], default: 'cashier' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
