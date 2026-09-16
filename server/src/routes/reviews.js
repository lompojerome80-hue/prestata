import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { recalcProviderRating } from '../services/ratingService.js';
import { notify } from '../services/notificationService.js';

const router = Router();

// POST /api/prestations/:id/review — le client note la prestation (obligatoire pour la suite)
router.post('/prestations/:id/review', requireAuth, async (req, res) => {
  const body = z
    .object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).optional().nullable(),
    })
    .parse(req.body);

  const prestation = await prisma.prestation.findUnique({
    where: { id: req.params.id },
    include: { request: { include: { provider: true } }, provider: true },
  });
  if (!prestation) throw new AppError(404, 'NOT_FOUND', 'Prestation introuvable');
  if (prestation.clientId !== req.user.id) throw new AppError(403, 'FORBIDDEN', 'Seul le client peut noter');

  const existingReview = await prisma.review.findUnique({ where: { prestationId: prestation.id } });
  if (existingReview) throw new AppError(409, 'ALREADY_REVIEWED', 'Cette prestation a déjà été notée');

  // Il faut que la prestation soit payée pour être notée
  if (prestation.status !== 'PAID') {
    throw new AppError(400, 'BAD_STATUS', 'La prestation doit être payée avant d’être notée');
  }

  const review = await prisma.review.create({
    data: {
      prestationId: prestation.id,
      authorId: req.user.id,
      providerId: prestation.providerId,
      rating: body.rating,
      comment: body.comment,
    },
  });

  await prisma.prestation.update({
    where: { id: prestation.id },
    data: { status: 'REVIEWED', reviewedAt: new Date() },
  });
  await prisma.request.update({
    where: { id: prestation.requestId },
    data: { status: 'REVIEWED' },
  });

  await recalcProviderRating(prestation.providerId);

  await notify({
    userId: prestation.provider?.userId,
    title: 'Nouvel avis',
    message: `${req.user.fullName} vous a attribué ${body.rating}/5`,
    type: 'REVIEW',
  });

  res.status(201).json({ review: { id: review.id, rating: review.rating, comment: review.comment } });
});

// GET /api/reviews?providerId= — avis publics d'un prestataire
router.get('/', optionalAuth, async (req, res) => {
  const providerId = String(req.query.providerId || '');
  if (!providerId) return res.json({ reviews: [] });

  const reviews = await prisma.review.findMany({
    where: { providerId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: true,
      prestation: { include: { request: { select: { title: true } } } },
    },
    take: 50,
  });

  res.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      authorName: r.author?.fullName,
      requestTitle: r.prestation?.request?.title,
    })),
  });
});

export default router;