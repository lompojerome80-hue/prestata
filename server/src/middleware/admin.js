import { forbidden } from '../utils/errors.js';

export function requireAdmin(req, _res, next) {
  if (!req.user?.isAdmin) throw forbidden('Accès réservé aux administrateurs');
  next();
}