import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { providerSummary, catSummary } from '../utils/serialize.js';
import { AppError, badRequest } from '../utils/errors.js';
import { notify } from '../services/notificationService.js';

const router = Router();

const RATE_UNITS = ['HEURE', 'JOUR', 'FORFAIT', 'MOT', 'PAGE', 'SESSION', 'SERVICE'];

const profileSchema = z.object({
  headline: z.string().min(3).max(120),
  bio: z.string().min(10).max(2000),
  avatarUrl: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  remoteOnly: z.boolean().optional().default(false),
  rate: z.number().int().min(0).optional().nullable(),
  rateUnit: z.enum(RATE_UNITS).optional().default('SERVICE'),
  categoryIds: z.array(z.string()).min(1, 'Choisissez au moins une catégorie'),
  portfolioLinks: z
    .array(z.object({ url: z.string().url(), caption: z.string().optional().nullable() }))
    .optional()
    .default([]),
});

async function attachCategories(providerId, categoryIds) {
  for (const categoryId of categoryIds) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) continue;
    await prisma.providerCategory.upsert({
      where: { providerId_categoryId: { providerId, categoryId } },
      create: { providerId, categoryId },
      update: {},
    });
  }
  // Nettoyer les catégories désélectionnées
  await prisma.providerCategory.deleteMany({
    where: { providerId, categoryId: { notIn: categoryIds } },
  });
}

// GET /api/providers/me — profil prestataire de l'utilisateur connecté
router.get('/me', requireAuth, async (req, res) => {
  const p = await prisma.providerProfile.findUnique({
    where: { userId: req.user.id },
    include: { categories: { include: { category: true } }, portfolio: true },
  });
  if (!p) {
    return res.json({ provider: null });
  }
  res.json({ provider: { ...providerSummary(p), portfolio: p.portfolio } });
});

// POST /api/providers — créer son profil prestataire (passe en PENDING → validation admin)
router.post('/', requireAuth, async (req, res) => {
  const data = profileSchema.parse(req.body);
  const existing = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
  if (existing) throw new AppError(409, 'PROVIDER_ALREADY_EXISTS', 'Vous avez déjà un profil prestataire');

  const provider = await prisma.providerProfile.create({
    data: {
      userId: req.user.id,
      headline: data.headline,
      bio: data.bio,
      avatarUrl: data.avatarUrl,
      city: data.city,
      neighborhood: data.neighborhood,
      remoteOnly: data.remoteOnly,
      rate: data.rate,
      rateUnit: data.rateUnit,
      verifiedBadge: req.user.phoneVerified,
      portfolio: {
        create: data.portfolioLinks.map((l) => ({ type: 'LINK', url: l.url, caption: l.caption })),
      },
    },
  });

  await attachCategories(provider.id, data.categoryIds);

  res.status(201).json({
    provider: providerSummary(
      await prisma.providerProfile.findUnique({
        where: { id: provider.id },
        include: { categories: { include: { category: true } }, portfolio: true },
      }),
    ),
  });
});

// PUT /api/providers/me — modifier son profil
router.put('/me', requireAuth, async (req, res) => {
  const provider = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw new AppError(404, 'NOT_FOUND', 'Créez d’abord votre profil prestataire');

  const data = profileSchema.partial().parse(req.body);

  const updateData = {};
  for (const key of ['headline', 'bio', 'avatarUrl', 'city', 'neighborhood', 'remoteOnly', 'rate', 'rateUnit']) {
    if (key in data && data[key] !== undefined) updateData[key] = data[key];
  }

  const updated = await prisma.providerProfile.update({
    where: { id: provider.id },
    data: updateData,
  });

  if (data.categoryIds) await attachCategories(provider.id, data.categoryIds);
  if (data.portfolioLinks && data.portfolioLinks.length) {
    await prisma.portfolioItem.createMany({
      data: data.portfolioLinks.map((l) => ({ providerId: provider.id, type: 'LINK', url: l.url, caption: l.caption })),
    });
  }

  res.json({
    provider: providerSummary(
      await prisma.providerProfile.findUnique({
        where: { id: updated.id },
        include: { categories: { include: { category: true } }, portfolio: true },
      }),
    ),
  });
});

// GET /api/providers/:id — fiche publique (visible une fois APPROVED)
router.get('/:id', optionalAuth, async (req, res) => {
  const provider = await prisma.providerProfile.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      categories: { include: { category: true } },
      portfolio: true,
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { author: true, prestation: { select: { request: { select: { title: true } } } } },
      },
    },
  });
  if (!provider) throw new AppError(404, 'NOT_FOUND', 'Prestataire introuvable');

  const isOwner = req.user?.id === provider.userId;
  if (provider.status !== 'APPROVED' && !isOwner) {
    throw new AppError(403, 'NOT_PUBLISHED', 'Ce profil n’est pas encore publié');
  }

  // Incrémenter les vues (pas si c'est le propriétaire)
  if (!isOwner) {
    await prisma.providerProfile.update({ where: { id: provider.id }, data: { viewCount: { increment: 1 } } });
  }

  res.json({
    provider: {
      ...providerSummary(provider),
      portfolio: provider.portfolio,
      reviews: provider.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        authorName: r.author?.fullName,
        avatarUrl: r.author?.avatarUrl,
        requestTitle: r.prestation?.request?.title,
      })),
    },
  });
});

// POST /api/providers/portfolio — ajouter un élément au portfolio (fichier ou lien)
router.post('/portfolio', requireAuth, async (req, res) => {
  const provider = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw new AppError(404, 'NOT_FOUND', 'Créez d’abord votre profil prestataire');

  const body = z
    .object({
      type: z.enum(['IMAGE', 'LINK']),
      url: z.string().min(1),
      caption: z.string().optional().nullable(),
    })
    .parse(req.body);

  const item = await prisma.portfolioItem.create({
    data: { providerId: provider.id, type: body.type, url: body.url, caption: body.caption },
  });
  res.status(201).json({ item });
});

// DELETE /api/providers/portfolio/:itemId
router.delete('/portfolio/:itemId', requireAuth, async (req, res) => {
  const provider = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
  if (!provider) throw badRequest('Créez d’abord votre profil prestataire');

  const item = await prisma.portfolioItem.findFirst({
    where: { id: req.params.itemId, providerId: provider.id },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Élément introuvable');

  await prisma.portfolioItem.delete({ where: { id: item.id } });
  res.json({ ok: true });
});

export default router;