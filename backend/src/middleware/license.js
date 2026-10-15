import axios from 'axios';

const RENIC_MASTER_URL = process.env.RENIC_MASTER_URL || 'https://renicsoft-backend.vercel.app';
const tenantCache = new Map();

/**
 * Verify whether a customerCode is registered and active in Renic Soft Master HQ
 */
export async function verifyTenantWithRenic(customerCode) {
  const clean = String(customerCode || '').trim().toLowerCase();
  if (!clean || clean === 'default' || clean === 'localhost' || clean === '127001') {
    return { verified: false, reason: 'DEFAULT_TENANT_NOT_PERMITTED' };
  }

  // Check in-memory cache
  const cached = tenantCache.get(clean);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    const res = await axios.get(`${RENIC_MASTER_URL}/api/v1/tenant/${clean}`, { timeout: 4000 });
    if (res.data && res.data.success && res.data.tenant) {
      const result = {
        verified: true,
        customerCode: res.data.tenant.customerCode || clean,
        shopName: res.data.tenant.shopName || res.data.tenant.name || 'Retail Store',
        softwareProduct: res.data.tenant.softwareProduct || 'SIMPLE_BILLING',
        licenseStatus: res.data.tenant.licenseStatus || 'active'
      };
      tenantCache.set(clean, { result, expiresAt: Date.now() + 10 * 60 * 1000 }); // Cache 10 mins
      return result;
    }
  } catch (err) {
    if (err.response?.status === 404) {
      const result = { verified: false, reason: 'TENANT_NOT_FOUND', message: `Store '${clean}' is not registered in Renic Soft.` };
      tenantCache.set(clean, { result, expiresAt: Date.now() + 60 * 1000 }); // Cache negative 1 min
      return result;
    }
    // If Renic Soft is temporarily unreachable and tenant was previously verified, keep them running
    if (cached?.result?.verified) {
      return cached.result;
    }
  }

  return { verified: false, reason: 'VERIFICATION_UNAVAILABLE', message: 'Unable to verify client registration with Renic Soft HQ.' };
}

/**
 * Middleware: Enforces that every operational request belongs to a registered client in Renic Soft.
 * Blocks all login and business logic if tenant is missing, default, or not registered in Renic Soft.
 */
export async function enforceClientRegistration(req, res, next) {
  const rawUrl = req.originalUrl || req.url || '';
  const pathname = rawUrl.split('?')[0];

  // Whitelisted system & health endpoints
  if (
    pathname === '/' ||
    pathname === '' ||
    pathname === '/health' ||
    pathname === '/api/health' ||
    pathname.startsWith('/health') ||
    pathname.startsWith('/api/health') ||
    pathname === '/api/auth/verify-tenant' ||
    pathname === '/api/auth/tenant-status'
  ) {
    return next();
  }

  const customerCode = req.customerCode;
  if (!customerCode || customerCode === 'default') {
    return res.status(403).json({
      success: false,
      code: 'MISSING_TENANT_PARAM',
      message: 'Access Restricted: Simple Billing must be accessed with your store URL containing the tenant parameter (e.g. ?tenant=your_store_code).'
    });
  }

  const check = await verifyTenantWithRenic(customerCode);
  if (!check.verified) {
    return res.status(403).json({
      success: false,
      code: 'CLIENT_NOT_REGISTERED',
      message: check.message || `Access Denied: Store '${customerCode}' is not registered in Renic Soft HQ. Please register this client in Renic Soft before accessing Simple Billing.`
    });
  }

  req.renicTenant = check;
  next();
}

export const checkLicense = (req, res, next) => next();

