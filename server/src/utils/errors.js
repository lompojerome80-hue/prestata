export class AppError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = 'Ressource introuvable') {
  return new AppError(404, 'NOT_FOUND', message);
}

export function unauthorized(message = 'Non autorisé') {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Accès refusé') {
  return new AppError(403, 'FORBIDDEN', message);
}

export function badRequest(message, details = {}) {
  return new AppError(400, 'BAD_REQUEST', message, details);
}

/**
 * Middleware Express centralisant la gestion des erreurs.
 */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err?.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        details: err.issues,
      },
    });
  }

  // Erreur de validation Prisma (contrainte unique, ...)
  if (err?.code === 'P2002') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Une entrée similaire existe déjà' },
    });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Ressource introuvable' },
    });
  }

  console.error('[error]', err);
  return res.status(500).json({
    error: { code: 'INTERNAL', message: 'Erreur interne du serveur' },
  });
}