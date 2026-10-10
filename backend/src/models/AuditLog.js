import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  performedBy: { type: String, default: 'System' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
