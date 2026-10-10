import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

export function runWithTenant(customerCode, callback) {
  return asyncLocalStorage.run({ customerCode: (customerCode || 'default').toLowerCase() }, callback);
}

export function getCurrentTenantCode() {
  const store = asyncLocalStorage.getStore();
  return store?.customerCode || 'default';
}

export default {
  runWithTenant,
  getCurrentTenantCode
};
