import fs from 'fs';
import path from 'path';

const root = 'd:/Development/Simple_Billing/backend';

function write(relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`[Created]: ${relPath}`);
}

// 1. .env
write('.env', `
PORT=5005
MONGODB_URI=mongodb://127.0.0.1:27017/simple_billing
JWT_SECRET=SimpleBilling_Secure_Key_2026_Retail
DEFAULT_CUSTOMER_CODE=DEFAULT
MOCK_DB=false
`);

// 2. src/config/db.js
write('src/config/db.js', `
import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/simple_billing';
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      mongoose.set('strictQuery', false);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000
      });
      console.log(\`\\x1b[32m[Simple Billing MongoDB Connected]: \${conn.connection.host}\\x1b[0m\`);
      isConnected = true;
      return;
    } catch (error) {
      console.warn(\`\\x1b[33m[MongoDB attempt \${attempt}/\${attempts}]: \${error.message}\\x1b[0m\`);
      if (attempt < attempts) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  console.error('\\x1b[31m[Fatal] MongoDB is unreachable. Check MONGODB_URI or MongoDB service.\\x1b[0m');
  process.exit(1);
};

export const getDBStatus = () => isConnected;
`);

console.log('Phase 1 files written');
