import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';

dotenv.config();

const PORT = parseInt(process.env.PORT, 10) || 5005;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\x1b[32m[Simple Billing Backend Running]: http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[36m[Linked to Renic Soft Platform on Port 5050/5175]\x1b[0m`);
  });
};

startServer().catch(err => {
  console.error('[Fatal Startup Error]:', err);
  process.exit(1);
});
