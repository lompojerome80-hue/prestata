import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { providerSummary, catSummary } from '../utils/serialize.js';
import { AppError } from '../utils/errors.js';
import { notify } from '../services/notificationService.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/providers/pending — profils à valider
router.get('/providers/pending', async (_req, res) => {
  const providers = await prisma.providerProfile.findMany({
    where: { status: 'PENDING' },
    include: { user: true, categories: { include: { category: true } }, portfolio: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ providers: providers.map(providerSummary) });
});

// GET /api/admin/providers — tous les profils (avec statut)
router.get('/providers', async (req, res) => {
  const status = req.query.status;
  const where = status ? { status: String(status) } : {};
  const providers = await prisma.providerProfile.findMany({
    where,
    include: { user: true, categories: { include: { category: true } }, portfolio: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ providers: providers.map(providerSummary) });
});

// POST /api/admin/providers/:id/decision — APPROVED ou REJECTED
router.post('/providers/:id/decision', async (req, res) => {
  const body = z
    .object({
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().max(500).optional().nullable(),
    })
    .parse(req.body);

  const provider = await prisma.providerProfile.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!provider) throw new AppError(404, 'NOT_FOUND', 'Profil prestataire introuvable');

  const updated = await prisma.providerProfile.update({
    where: { id: provider.id },
    data: { status: body.status, rejectionReason: body.reason || null },
  });

  await notify({
    userId: provider.userId,
    title: body.status === 'APPROVED' ? 'Profil publié ✅' : 'Profil refusé',
    message:
      body.status === 'APPROVED'
        ? 'Votre profil prestataire est maintenant publié et visible dans la recherche.'
        : `Votre profil n'a pas été validé. Motif : ${body.reason || 'non précisé'}.`,
    type: 'PROFILE',
  });

  res.json({
    provider: providerSummary(
      await prisma.providerProfile.findUnique({
        where: { id: updated.id },
        include: { user: true, categories: { include: { category: true } }, portfolio: true },
      }),
    ),
  });
});

// GET /api/admin/stats — catégories les plus demandées + compteurs
router.get('/stats', async (_req, res) => {
  const [topCategories, pendingCount, providersCount, usersCount, prestationsCount] = await Promise.all([
    prisma.category.findMany({ orderBy: { requestCount: 'desc' }, take: 15 }),
    prisma.providerProfile.count({ where: { status: 'PENDING' } }),
    prisma.providerProfile.count(),
    prisma.user.count(),
    prisma.prestation.count(),
  ]);

  res.json({
    topCategories: topCategories.map(catSummary),
    pendingCount,
    providersCount,
    usersCount,
    prestationsCount,
  });
});

export default router;