import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { prestationOut } from '../utils/serialize.js';
import { notify } from '../services/notificationService.js';

const router = Router();

const includeAll = {
  request: { include: { client: true } },
  provider: { include: { user: true } },
  client: true,
  payment: true,
  review: true,
};

// GET /api/prestations?role=client|provider — mes prestations
router.get('/', requireAuth, async (req, res) => {
  const role = req.query.role === 'provider' ? 'provider' : 'client';
  const where =
    role === 'provider'
      ? { provider: { userId: req.user.id } }
      : { clientId: req.user.id };

  const prestations = await prisma.prestation.findMany({
    where,
    include: includeAll,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ prestations: prestations.map(prestationOut) });
});

// GET /api/prestations/:id
router.get('/:id', requireAuth, async (req, res) => {
  const p = await prisma.prestation.findUnique({
    where: { id: req.params.id },
    include: includeAll,
  });
  if (!p) throw new AppError(404, 'NOT_FOUND', 'Prestation introuvable');

  const isClient = p.clientId === req.user.id;
  const isProvider = p.provider?.userId === req.user.id;
  if (!isClient && !isProvider && !req.user.isAdmin) throw new AppError(403, 'FORBIDDEN');

  const reviewed = !!(await prisma.review.findUnique({ where: { prestationId: p.id } }));

  res.json({
    prestation: {
      ...prestationOut(p),
      request: p.request
        ? {
            id: p.request.id,
            title: p.request.title,
            description: p.request.description,
            status: p.request.status,
            reference: p.request.reference,
            city: p.request.deliveryCity,
            createdAt: p.request.createdAt,
            clientPhone: isClient ? undefined : p.request.client?.phone,
          }
        : null,
      payment: p.payment
        ? {
            id: p.payment.id,
            provider: p.payment.provider,
            providerRef: p.payment.providerRef,
            status: p.payment.status,
            amount: p.payment.amount,
            createdAt: p.payment.createdAt,
          }
        : null,
      review: reviewed,
    },
  });
});

// POST /api/prestations/:id/complete — le prestataire indique que le travail est fini
router.post('/:id/complete', requireAuth, async (req, res) => {
  const p = await prisma.prestation.findUnique({
    where: { id: req.params.id },
    include: { request: { include: { client: true } }, provider: true },
  });
  if (!p) throw new AppError(404, 'NOT_FOUND', 'Prestation introuvable');
  if (p.provider?.userId !== req.user.id) throw new AppError(403, 'FORBIDDEN', 'Seul le prestataire peut clôturer');

  if (!['IN_PROGRESS', 'ACCEPTED'].includes(p.status)) {
    throw new AppError(400, 'BAD_STATUS', 'Prestation non concernée');
  }

  const updated = await prisma.prestation.update({
    where: { id: p.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
  await prisma.request.update({
    where: { id: p.requestId },
    data: { status: 'COMPLETED' },
  });

  await notify({
    userId: p.clientId,
    title: 'Prestation terminée',
    message: `${req.user.fullName} a terminé « ${p.request.title} ». Confirmez et payez.`,
    type: 'PAYMENT',
  });

  res.json({ prestation: prestationOut(await prisma.prestation.findUnique({ where: { id: updated.id }, include: { request: true, provider: { include: { user: true } }, client: true, payment: true, review: true } })) });
});

export default router;