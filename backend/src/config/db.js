import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    isConnected = true;
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/simple_billing';
  const attempts = process.env.VERCEL ? 1 : 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      mongoose.set('strictQuery', false);
      const conn = await mongoose.connect(uri, {
        dbName: 'simple_billing',
        serverSelectionTimeoutMS: 5000
      });
      console.log(`\x1b[32m[Simple Billing MongoDB Connected]: ${conn.connection.host}\x1b[0m`);
      isConnected = true;
      return conn;
    } catch (error) {
      console.warn(`\x1b[33m[MongoDB attempt ${attempt}/${attempts}]: ${error.message}\x1b[0m`);
      if (attempt < attempts) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  if (process.env.VERCEL) {
    console.error('[Vercel Serverless] MongoDB connection failed. Please check MONGODB_URI environment variable in Vercel settings.');
    throw new Error('Database connection failed. Please check MONGODB_URI environment variable in Vercel.');
  }

  console.error('\x1b[31m[Fatal] MongoDB is unreachable. Check MONGODB_URI or MongoDB service.\x1b[0m');
  process.exit(1);
};

export const getDBStatus = () => isConnected;
