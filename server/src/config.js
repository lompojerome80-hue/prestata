import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = process.env.NODE_ENV || 'development';
const isDev = env !== 'production';

if (!isDev && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET est obligatoire en production (à définir dans Render → Environment).');
}

const omConfigured = Boolean(
  process.env.OM_API_BASE_URL && process.env.OM_CLIENT_ID && process.env.OM_CLIENT_SECRET,
);
const moovConfigured = Boolean(
  process.env.MOOV_API_BASE_URL && process.env.MOOV_CLIENT_ID && process.env.MOOV_CLIENT_SECRET,
);

const availableProviders = isDev
  ? ['ORANGE_MONEY', 'MOOV_MONEY']
  : [omConfigured && 'ORANGE_MONEY', moovConfigured && 'MOOV_MONEY'].filter(Boolean);

export const config = {
  env,
  isDev,
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  uploadsDir: path.join(__dirname, '..', 'uploads'), // conservé pour compat (plus utilisé)
  adminPhone: process.env.ADMIN_PHONE || '',
  corsOrigin: isDev ? true : process.env.CORS_ORIGIN || 'https://prestata.onrender.com',
  // Paiements
  //  - Dev : sandbox disponible (aucun débit réel).
  //  - Prod : paiement dispo uniquement si un fournisseur Mobile Money est configuré.
  paymentsSandbox: isDev && process.env.PAYMENTS_SANDBOX !== 'false',
  paymentsAvailable: availableProviders.length > 0,
  availableProviders,
  om: {
    apiBaseUrl: process.env.OM_API_BASE_URL || '',
    callbackUrl: process.env.OM_CALLBACK_URL || '',
    clientId: process.env.OM_CLIENT_ID || '',
    clientSecret: process.env.OM_CLIENT_SECRET || '',
  },
  moov: {
    apiBaseUrl: process.env.MOOV_API_BASE_URL || '',
    callbackUrl: process.env.MOOV_CALLBACK_URL || '',
    clientId: process.env.MOOV_CLIENT_ID || '',
    clientSecret: process.env.MOOV_CLIENT_SECRET || '',
  },
  // SMS (vérification du téléphone)
  sms: {
    apiUrl: process.env.SMS_API_URL || '',
    apiKey: process.env.SMS_API_KEY || '',
  },
};