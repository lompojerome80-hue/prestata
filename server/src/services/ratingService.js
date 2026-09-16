import { prisma } from '../db.js';

/**
 * Recalculer la note moyenne d'un prestataire (moyenne des reviews).
 */
export async function recalcProviderRating(providerId) {
  const stats = await prisma.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.providerProfile.update({
    where: { id: providerId },
    data: {
      ratingAvg: stats._avg.rating ?? 0,
      ratingCount: stats._count.rating ?? 0,
    },
  });
}