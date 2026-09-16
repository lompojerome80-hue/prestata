import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { quoteOut } from '../utils/serialize.js';
import { notify } from '../services/notificationService.js';

const router = Router();

// Le prestataire doit posséder un profil pour envoyer un devis
async function resolveOwnProvider(userId) {
  return prisma.providerProfile.findUnique({ where: { userId } });
}

// POST /api/requests/:id/quotes — le prestataire répond avec un devis
router.post('/requests/:id/quotes', requireAuth, async (req, res) => {
  const provider = await resolveOwnProvider(req.user.id);
  if (!provider) throw new AppError(404, 'NOT_FOUND', 'Créez un profil prestataire pour répondre aux demandes');

  const request = await prisma.request.findUnique({ where: { id: req.params.id } });
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Demande introuvable');
  if (request.providerId !== provider.id) throw new AppError(403, 'FORBIDDEN', 'Cette demande ne vous est pas adressée');
  if (!['NEW', 'QUOTE_SENT'].includes(request.status)) {
    throw new AppError(400, 'BAD_STATUS', 'La demande n’accepte plus de devis');
  }

  const body = z
    .object({
      amount: z.number().int().min(1, 'Montant invalide'),
      description: z.string().min(5).optional().nullable(),
      delayDays: z.number().int().min(1).optional().nullable(),
    })
    .parse(req.body);

  const quote = await prisma.quote.create({
    data: {
      requestId: request.id,
      amount: body.amount,
      description: body.description,
      delayDays: body.delayDays,
    },
    // Déjà en QUOTE_SENT si un devis existait
  });

  if (request.status === 'NEW') {
    await prisma.request.update({
      where: { id: request.id },
      data: {
        status: 'QUOTE_SENT',
        events: { create: { type: 'QUOTE_SENT', payload: JSON.stringify({ quoteId: quote.id }) } },
      },
    });
  }

  await notify({
    userId: request.clientId,
    title: 'Nouveau devis reçu',
    message: `${req.user.fullName} a répondu à votre demande « ${request.title} » (${body.amount} FCFA).`,
    type: 'QUOTE',
  });

  res.status(201).json({ quote: quoteOut(quote) });
});

// GET /api/requests/:id/quotes — devis d'une demande (participants)
router.get('/requests/:id/quotes', requireAuth, async (req, res) => {
  const request = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: { provider: true },
  });
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Demande introuvable');

  const isClient = request.clientId === req.user.id;
  const isProvider = request.provider?.userId === req.user.id;
  if (!isClient && !isProvider && !req.user.isAdmin) throw new AppError(403, 'FORBIDDEN');

  const quotes = await prisma.quote.findMany({
    where: { requestId: request.id },
    include: { request: { select: { status: true, clientId: true, providerId: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ quotes: quotes.map(quoteOut) });
});

// POST /api/quotes/:id/accept — le client accepte le devis → création de la prestation
router.post('/quotes/:id/accept', requireAuth, async (req, res) => {
  const quote = await prisma.quote.findUnique({ where: { id: req.params.id }, include: { request: true } });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Devis introuvable');

  const request = quote.request;
  if (request.clientId !== req.user.id) throw new AppError(403, 'FORBIDDEN', 'Seul le client peut accepter un devis');
  if (request.status !== 'QUOTE_SENT') {
    throw new AppError(400, 'BAD_STATUS', 'Ce devis ne peut plus être accepté');
  }

  const prestation = await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
    await tx.quote.updateMany({
      where: { requestId: request.id, id: { not: quote.id }, status: 'SENT' },
      data: { status: 'REJECTED' },
    });
    const updatedRequest = await tx.request.update({
      where: { id: request.id },
      data: {
        status: 'ACCEPTED',
        events: { create: { type: 'ACCEPTED', payload: JSON.stringify({ quoteId: quote.id }) } },
      },
    });
    const prestation = await tx.prestation.create({
      data: {
        requestId: request.id,
        providerId: request.providerId,
        clientId: request.clientId,
        amount: quote.amount,
      },
    });
    return { updatedRequest, prestation };
  });

  const providerRecord = await prisma.providerProfile.findUnique({ where: { id: request.providerId } });
  await notify({
    userId: providerRecord?.userId,
    title: 'Devis accepté !',
    message: `Le client a accepté votre devis (${quote.amount} FCFA) pour « ${request.title} ».`,
    type: 'QUOTE',
  });

  res.json({ prestation: { id: prestation.prestation.id, status: prestation.prestation.status }, requestStatus: prestation.updatedRequest.status });
});

// POST /api/quotes/:id/reject — le client refuse le devis
router.post('/quotes/:id/reject', requireAuth, async (req, res) => {
  const quote = await prisma.quote.findUnique({ where: { id: req.params.id }, include: { request: true } });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Devis introuvable');
  if (quote.request.clientId !== req.user.id) throw new AppError(403, 'FORBIDDEN');

  await prisma.quote.update({ where: { id: quote.id }, data: { status: 'REJECTED' } });
  res.json({ ok: true });
});

export default router;