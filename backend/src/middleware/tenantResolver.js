import jwt from 'jsonwebtoken';
import { runWithTenant } from './tenantContext.js';

const JWT_SECRET = process.env.JWT_SECRET || 'SimpleBilling_Secure_Key_2026_Retail';
const APP_SLUGS = new Set(['billing', 'retail', 'pos', 'petti', 'pb', 'challan', 'wa', 'hq', 'api']);

function resolveCodeFromHost(rawHost) {
  const host = String(rawHost || '').split(':')[0].toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') return '';

  const parts = host.split('.').filter(Boolean);
  if (parts.length >= 3 && APP_SLUGS.has(parts[0])) {
    return parts[1];
  }
  if (parts.length >= 2 && !APP_SLUGS.has(parts[0])) {
    return parts[0];
  }
  return '';
}

export function tenantResolver(req, res, next) {
  let customerCode = '';

  // 1. Explicit request headers
  const headerCode = req.headers['x-customer-code'] ||
    req.headers['x-customer-id'] ||
    req.headers['x-tenant-code'] ||
    req.headers['x-tenant-id'] ||
    req.headers['x-client-id'];
  if (headerCode) {
    customerCode = String(headerCode).trim().toLowerCase();
  }

  // 2. Request body (for login/registration calls where header might not be set yet)
  if (!customerCode && req.body) {
    const bodyCode = req.body.customerCode || req.body.customerId || req.body.clientCode;
    if (bodyCode) {
      customerCode = String(bodyCode).trim().toLowerCase();
    }
  }

  // 3. Query params (e.g. ?code=XYZ or ?customerCode=XYZ or ?tenant=XYZ)
  if (!customerCode && req.query) {
    const qCode = req.query.customerCode || req.query.customerId || req.query.code || req.query.tenant;
    if (qCode) {
      customerCode = String(qCode).trim().toLowerCase();
    }
  }

  // 4. Bearer JWT token payload
  if (!customerCode && req.headers.authorization?.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.decode(token);
      if (decoded?.customerCode || decoded?.customerId) {
        customerCode = String(decoded.customerCode || decoded.customerId).trim().toLowerCase();
      }
    } catch (e) {
      // Ignore token parse error here
    }
  }

  // 5. Host header / subdomain
  if (!customerCode) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    customerCode = resolveCodeFromHost(host);
  }

  // Default fallback
  if (!customerCode || customerCode === 'undefined' || customerCode === 'null') {
    customerCode = 'default';
  }

  const cleanCode = customerCode.replace(/[^a-z0-9_-]/g, '');
  req.customerCode = cleanCode;
  res.setHeader('X-Resolved-Tenant', cleanCode);
  res.setHeader('X-Customer-Code', cleanCode);

  runWithTenant(cleanCode, () => {
    next();
  });
}

export default tenantResolver;
