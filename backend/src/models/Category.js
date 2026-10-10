import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  translations: {
    ta: { type: String, trim: true, default: '' }, // Tamil
    hi: { type: String, trim: true, default: '' }, // Hindi
    te: { type: String, trim: true, default: '' }, // Telugu
    kn: { type: String, trim: true, default: '' }, // Kannada
    ml: { type: String, trim: true, default: '' }  // Malayalam
  },
  icon: { type: String, default: 'Tag' },
  color: { type: String, default: '#84cc16' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

categorySchema.index({ name: 1 });

export default mongoose.models.Category || mongoose.model('Category', categorySchema);
