import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';

const router = Router();

const MAX_RAW_BYTES = 4 * 1024 * 1024; // 4 Mo

// Les images sont stockées en base de données (data URI) : elles survivent
// aux redémarrages / re-déploiements (disque éphémère sur les hébergeurs gratuits).
router.post('/', requireAuth, (req, res) => {
  const { dataUrl } = req.body || {};
  if (!dataUrl) throw new AppError(400, 'NO_FILE', 'Aucune image reçue');

  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is.exec(dataUrl);
  if (!m) throw new AppError(400, 'BAD_FILE_TYPE', "Format d'image invalide (attendu : data:image/*;base64,…)");

  const b64 = m[2].replace(/\s/g, '');
  const bytes = Buffer.from(b64, 'base64');
  if (bytes.length === 0 || bytes.toString('base64').replace(/=+$/, '') !== b64.replace(/=+$/, '')) {
    throw new AppError(400, 'BAD_FILE_TYPE', "Données d'image invalides (base64 corrompu)");
  }
  if (bytes.length > MAX_RAW_BYTES) throw new AppError(413, 'FILE_TOO_LARGE', "L'image ne doit pas dépasser 4 Mo");

  res.status(201).json({ url: dataUrl });
});

export default router;