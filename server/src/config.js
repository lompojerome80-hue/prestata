import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  uploadsDir: path.join(__dirname, '..', 'uploads'),
  // Paiements
  paymentsSandbox: process.env.PAYMENTS_SANDBOX !== 'false',
  om: {
    apiBaseUrl: process.env.OM_API_BASE_URL || '',
    callbackUrl: process.env.OM_CALLBACK_URL || '',
    clientId: process.env.OM_CLIENT_ID || '',
    clientSecret: process.env.OM_CLIENT_SECRET || '',
  },
  moov: {
    apiBaseUrl: process.env.MOOV_API_BASE_URL || '',
    clientId: process.env.MOOV_CLIENT_ID || '',
    clientSecret: process.env.MOOV_CLIENT_SECRET || '',
  },
};