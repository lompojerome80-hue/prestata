import { Router } from 'express';
import { prisma } from '../db.js';
import { confirmPaymentById } from '../services/paymentService.js';

const router = Router();

// Webhook Orange Money / Moov Money (production). En sandbox, inutilisé.
router.post('/orange-money', async (req, res) => {
  const payload = req.body;
  const providerRef = payload?.getPaymentUrl || payload?.paymentDetails?.paymentRef || payload?.payment_ref;
  if (!providerRef) return res.status(200).json({ ok: true });

  const payment = await prisma.payment.findUnique({ where: { providerRef } });
  if (payment) {
    await confirmPaymentById({ paymentId: payment.id, providerRef });
  }
  res.json({ ok: true });
});

export default router;