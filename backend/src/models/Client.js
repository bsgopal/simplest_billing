import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gstNumber: { type: String, default: '' },
  address: { type: String, default: '' },
  contact: { type: String, default: '' },
  licenseKey: { type: String, unique: true, sparse: true },
  licenseStatus: {
    type: String,
    enum: ['trial', 'active', 'grace_period', 'locked', 'cancelled', 'pending_activation'],
    default: 'active'
  },
  licenseStart: { type: Date, default: Date.now },
  licenseEnd: { type: Date, default: () => new Date(Date.now() + 365*24*60*60*1000) },
  customerCode: { type: String, sparse: true, uppercase: true, trim: true, index: true },
  shopSlug: { type: String, lowercase: true, trim: true, default: '' },
  softwareProduct: { type: String, default: 'SIMPLE_BILLING' },
  shopType: { type: String, enum: ['petti', 'vegetable', 'departmental', 'general'], default: 'petti' }
}, { timestamps: true });

export default mongoose.models.Client || mongoose.model('Client', clientSchema);
