export const checkLicense = (req, res, next) => {
  // Simple billing is always active for valid tenants
  next();
};
