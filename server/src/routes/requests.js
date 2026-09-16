import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { randomToken } from '../utils/crypto.js';
import { quoteOut } from '../utils/serialize.js';
import { notify } from '../services/notificationService.js';

const router = Router();

const requestInclude = {
  client: true,
  provider: { include: { user: true, categories: { include: { category: true } } } },
  category: true,
  quotes: { include: { request: { select: { status: true } } } },
  prestation: true,
  conversation: { include: { messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { sender: true } } } },
};

/**
 * Règle de confiance : un client doit noter chaque prestation terminée
 * avant de pouvoir soumettre une nouvelle demande.
 */
async function assertCanCreateRequest(userId) {
  const unpaid = await prisma.prestation.findFirst({
    where: {
      clientId: userId,
      status: { in: ['COMPLETED', 'PAID'] }, // payée ou en attente de paiement mais non notée
      review: null,
    },
    include: { request: true },
  });
  if (unpaid) {
    throw new AppError(
      409,
      'REVIEW_REQUIRED',
      `Vous devez noter la prestation « ${unpaid.request.title} » avant de soumettre une nouvelle demande.`,
    );
  }
}

// POST /api/requests — le client crée une demande pour un prestataire
router.post('/', requireAuth, async (req, res) => {
  await assertCanCreateRequest(req.user.id);

  const body = z
    .object({
      providerId: z.string().min(1),
      title: z.string().min(3).max(150),
      description: z.string().min(10).max(4000),
      kind: z.enum(['ARTISAN', 'FREELANCE']).default('ARTISAN'),
      budget: z.number().int().min(0).optional().nullable(),
      photoUrl: z.string().optional().nullable(),
      urgency: z.enum(['TODAY', 'THIS_WEEK']).optional().nullable(),
      city: z.string().optional().nullable(),
      categoryId: z.string().optional().nullable(),
    })
    .parse(req.body);

  const provider = await prisma.providerProfile.findUnique({ where: { id: body.providerId } });
  if (!provider) throw new AppError(404, 'NOT_FOUND', 'Prestataire introuvable');

  const reference = `RQ-${randomToken(6).toUpperCase()}`;

  const request = await prisma.request.create({
    data: {
      reference,
      clientId: req.user.id,
      providerId: provider.id,
      categoryId: body.categoryId || null,
      kind: body.kind,
      title: body.title,
      description: body.description,
      budget: body.budget,
      photoUrl: body.photoUrl,
      urgency: body.urgency,
      deliveryCity: body.city,
      events: { create: { type: 'CREATED', payload: JSON.stringify({ by: req.user.id }) } },
    },
  });

  // Incrémenter le compteur de la catégorie (back-office)
  if (body.categoryId) {
    await prisma.category.update({ where: { id: body.categoryId }, data: { requestCount: { increment: 1 } } });
  }

  // Créer automatiquement la conversation entre les deux parties
  const conversation = await prisma.conversation.create({
    data: {
      requestId: request.id,
      participants: {
        create: [
          { userId: req.user.id },
          { userId: provider.userId },
        ],
      },
    },
  });

  await notify({
    userId: provider.userId,
    title: 'Nouvelle demande',
    message: `${req.user.fullName} vous a envoyé une demande : « ${request.title} »`,
    type: 'REQUEST',
  });

  res.status(201).json({
    request: await buildRequest(request.id, requestInclude),
    conversationId: conversation.id,
  });
});

async function buildRequest(id, include) {
  const r = await prisma.request.findUnique({ where: { id }, include });
  return serializeRequest(r);
}

export function serializeRequest(r) {
  return {
    id: r.id,
    reference: r.reference,
    clientId: r.clientId,
    clientName: r.client?.fullName,
    client: r.client
      ? { id: r.client.id, fullName: r.client.fullName, avatarUrl: r.client.avatarUrl }
      : null,
    providerId: r.providerId,
    providerName: r.provider?.user?.fullName,
    providerStatus: r.provider?.status,
    category: r.category
      ? { id: r.category.id, name: r.category.name, slug: r.category.slug }
      : null,
    kind: r.kind,
    title: r.title,
    description: r.description,
    budget: r.budget,
    photoUrl: r.photoUrl,
    urgency: r.urgency,
    city: r.deliveryCity,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    quotes: (r.quotes || []).map(quoteOut),
    prestation: r.prestation
      ? {
          id: r.prestation.id,
          amount: r.prestation.amount,
          status: r.prestation.status,
        }
      : null,
    conversationId: r.conversation?.id,
    lastMessage: r.conversation?.messages?.[0]
      ? {
          body: r.conversation.messages[0].body,
          from: r.conversation.messages[0].sender?.fullName,
          createdAt: r.conversation.messages[0].createdAt,
        }
      : null,
  };
}

// GET /api/requests/incoming — demandes reçues par le prestataire connecté
router.get('/incoming', requireAuth, async (req, res) => {
  const provider = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
  if (!provider) return res.json({ requests: [] });

  const requests = await prisma.request.findMany({
    where: { providerId: provider.id, status: { not: 'CANCELLED' } },
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ requests: requests.map(serializeRequest) });
});

// GET /api/requests/outgoing — demandes envoyées par le client connecté
router.get('/outgoing', requireAuth, async (req, res) => {
  const requests = await prisma.request.findMany({
    where: { clientId: req.user.id, status: { not: 'CANCELLED' } },
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ requests: requests.map(serializeRequest) });
});

// GET /api/requests/:id — détail (client, prestataire ou admin)
router.get('/:id', requireAuth, async (req, res) => {
  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: requestInclude,
  });
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Demande introuvable');

  const provider = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
  const isClient = request.clientId === req.user.id;
  const isProvider = provider?.id === request.providerId;
  if (!isClient && !isProvider && !req.user.isAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Accès refusé');
  }

  res.json({ request: serializeRequest(request) });
});

// POST /api/requests/:id/cancel — annuler (par le client tant que pas accepté)
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Demande introuvable');
  if (request.clientId !== req.user.id) throw new AppError(403, 'FORBIDDEN', 'Seul le client peut annuler');
  if (!['NEW', 'QUOTE_SENT'].includes(request.status)) {
    throw new AppError(400, 'BAD_STATUS', 'Impossible d’annuler une demande déjà acceptée');
  }

  const updated = await prisma.request.update({
    where: { id: request.id },
    data: {
      status: 'CANCELLED',
      events: { create: { type: 'CANCELLED', payload: JSON.stringify({ by: req.user.id }) } },
    },
  });

  const provider = await prisma.providerProfile.findUnique({ where: { id: request.providerId } });
  if (provider) {
    await notify({
      userId: provider.userId,
      title: 'Demande annulée',
      message: `La demande « ${request.title} » a été annulée par le client`,
      type: 'INFO',
    });
  }

  res.json({ request: serializeRequest(await prisma.request.findUnique({ where: { id: updated.id }, include: requestInclude })) });
});

export default router;