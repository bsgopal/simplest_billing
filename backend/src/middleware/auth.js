import jwt from 'jsonwebtoken';
import { getTenantDb } from '../config/tenantConnectionManager.js';

const JWT_SECRET = process.env.JWT_SECRET || 'SimpleBilling_Secure_Key_2026_Retail';

export const protect = async (req, res, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { User } = getTenantDb(req.customerCode);
    const user = await User.findById(decoded.id).select('-pin');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or account deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expired or invalid token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user?.role}' is not authorized to perform this action`
      });
    }
    next();
  };
};
