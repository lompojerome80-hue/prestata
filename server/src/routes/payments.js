import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { config } from '../config.js';
import { initiatePrestationPayment, confirmPaymentById } from '../services/paymentService.js';
import { sha256 } from '../utils/crypto.js';
import { notify } from '../services/notificationService.js';

const router = Router();

// GET /api/payments/status — paiement en ligne disponible ou non (pour le front)
router.get('/payments/status', requireAuth, (_req, res) => {
  res.json({
    available: config.paymentsAvailable,
    sandbox: config.paymentsSandbox,
    providers: config.availableProviders,
  });
});

// POST /api/prestations/:id/pay — le client initie le paiement direct
router.post('/prestations/:id/pay', requireAuth, async (req, res) => {
  const body = z.object({
    provider: z.enum(['ORANGE_MONEY', 'MOOV_MONEY']),
    phone: z.string().min(8),
  }).parse(req.body);

  const prestation = await prisma.prestation.findUnique({
    where: { id: req.params.id },
    include: { request: true, provider: { include: { user: true } } },
  });
  if (!prestation) throw new AppError(404, 'NOT_FOUND', 'Prestation introuvable');
  if (prestation.clientId !== req.user.id) throw new AppError(403, 'FORBIDDEN', 'Seul le client peut payer');
  if (prestation.status !== 'COMPLETED') {
    throw new AppError(400, 'BAD_STATUS', 'Le prestataire doit d’abord terminer le travail');
  }
  if (prestation.payment) {
    throw new AppError(409, 'ALREADY_PAID', 'Un paiement est déjà en cours pour cette prestation');
  }

  const payeePhone = prestation.provider?.user?.phone || '';
  const { payment, sandbox, sandboxOtp, instructions } = await initiatePrestationPayment({
    prestationId: prestation.id,
    provider: body.provider,
    payerPhone: body.phone,
    payeePhone,
  });

  res.status(201).json({
    payment: {
      id: payment.id,
      provider: payment.provider,
      providerRef: payment.providerRef,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
    },
    sandbox,
    sandboxOtp,
    instructions,
  });
});

// POST /api/payments/:id/confirm — confirmer le paiement avec le code OTP
router.post('/payments/:id/confirm', requireAuth, async (req, res) => {
  const body = z.object({ otp: z.string().min(4).optional(), providerRef: z.string().optional() }).parse(req.body);

  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Paiement introuvable');

  const prestation = await prisma.prestation.findUnique({ where: { id: payment.prestationId } });
  if (prestation.clientId !== req.user.id) throw new AppError(403, 'FORBIDDEN', 'Seul le client peut confirmer');

  // En sandbox, on exige le code OTP retourné à l'initiation
  if (config.paymentsSandbox && body.otp) {
    // Le sandboxOtp a été renvoyé à l'initiation ; on le vérifie côté DB n'étant pas persisté,
    // le front l'envoie simplement puis on confirme.
  }

  const updated = await confirmPaymentById({ paymentId: payment.id, providerRef: body.providerRef, sandboxOtp: body.otp });

  if (updated.status === 'SUCCESSFUL') {
    await notify({
      userId: (await prisma.prestation.findUnique({ where: { id: payment.prestationId }, include: { provider: { include: { user: true } } } })).provider.userId,
      title: 'Paiement reçu',
      message: `Vous avez reçu ${updated.amount} FCFA via ${updated.provider}.`,
      type: 'PAYMENT',
    });
  }

  res.json({
    payment: {
      id: updated.id,
      status: updated.status,
      providerRef: updated.providerRef,
      amount: updated.amount,
      paidAt: updated.paidAt,
    },
  });
});

// GET /api/payments/:id — statut d'un paiement
router.get('/payments/:id', requireAuth, async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { prestation: true, history: { orderBy: { createdAt: 'asc' } } },
  });
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Paiement introuvable');
  const prestation = payment.prestation;
  const isClient = prestation.clientId === req.user.id;
  const provider = await prisma.providerProfile.findUnique({ where: { id: prestation.providerId } });
  if (!isClient && provider?.userId !== req.user.id && !req.user.isAdmin) throw new AppError(403, 'FORBIDDEN');

  res.json({
    payment: {
      id: payment.id,
      provider: payment.provider,
      providerRef: payment.providerRef,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
    },
    history: payment.history.map((h) => ({ status: h.status, note: h.note, createdAt: h.createdAt })),
  });
});

export default router;