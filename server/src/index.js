import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { errorHandler, AppError } from './utils/errors.js';

import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import searchRoutes from './routes/search.js';
import providerRoutes from './routes/providers.js';
import requestRoutes from './routes/requests.js';
import quoteRoutes from './routes/quotes.js';
import conversationRoutes from './routes/conversations.js';
import prestationRoutes from './routes/prestations.js';
import paymentRoutes from './routes/payments.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhooks.js';
import uploadRoutes from './routes/uploads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Fichiers statiques (avatars, portfolio, photos de demande)
app.use('/uploads', express.static(config.uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: config.env, paymentsSandbox: config.paymentsSandbox });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api', quoteRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/prestations', prestationRoutes);
app.use('/api', paymentRoutes);
app.use('/api', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);

// 404 API
app.use('/api', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Route API introuvable')));

// En production, le serveur sert aussi le frontend React buildé (web/dist) :
// une seule URL (même origine), style site web "réel".
if (config.env === 'production') {
  const webDist = path.resolve(__dirname, '..', '..', 'web', 'dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }
}

// Gestion d'erreur centrale (attention : ensuite front a un fallback ? non)
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[prestata] API en écoute sur http://localhost:${config.port}`);
  console.log(`[prestata] Paiement sandbox : ${config.paymentsSandbox ? 'OUI' : 'NON (production)'}`);
});