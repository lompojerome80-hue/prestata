import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { unauthorized } from '../utils/errors.js';

/**
 * Middleware : charge req.user depuis le JWT Bearer.
 */
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized('Token manquant');
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!req.user) throw unauthorized('Utilisateur introuvable');
    next();
  } catch {
    throw unauthorized('Token invalide ou expiré');
  }
}

/**
 * Optionnel : charge req.user si un JWT est présent, sinon req.user = null.
 */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), config.jwtSecret);
      req.user = await prisma.user.findUnique({ where: { id: payload.sub } });
    } catch { /* token invalide, on continue sans user */ }
  }
  next();
}