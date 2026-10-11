import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { tenantResolver } from './middleware/tenantResolver.js';

import authRoutes from './routes/auth.js';
import billRoutes from './routes/bills.js';
import itemRoutes from './routes/items.js';
import customerRoutes from './routes/customers.js';
import supplierRoutes from './routes/suppliers.js';
import purchaseRoutes from './routes/purchases.js';
import expenseRoutes from './routes/expenses.js';
import dayCloseRoutes from './routes/dayclose.js';
import reportRoutes from './routes/reports.js';
import settingRoutes from './routes/settings.js';
import categoryRoutes from './routes/categories.js';

import { connectDB } from './config/db.js';

dotenv.config();

const app = express();

// Global Permissive CORS middleware for cross-origin Vercel deployments
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Customer-Code, X-Customer-Id');

  // Immediately respond to OPTIONS preflight without waiting for DB or routes
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure database connection is ready for serverless requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use(tenantResolver);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dayclose', dayCloseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Simple Retail & Petti Shop Billing',
    tenant: req.customerCode,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
