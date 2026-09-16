import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser } from '../utils/serialize.js';
import { badRequest, unauthorized, AppError } from '../utils/errors.js';
import { sendVerificationOtp, verifyOtp } from '../services/otpService.js';

const router = Router();

function signToken(user) {
  return jwt.sign({ sub: user.id, phone: user.phone }, config.jwtSecret, { expiresIn: '30d' });
}

const normalizePhone = (phone) => String(phone || '').replace(/[\s-]/g, '');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const body = z
    .object({
      fullName: z.string().min(2, 'Nom trop court'),
      phone: z.string().min(8, 'Numéro invalide'),
      password: z.string().min(6, 'Mot de passe : 6 caractères min'),
      wantProvider: z.boolean().optional().default(false),
    })
    .parse(req.body);

  const phone = normalizePhone(body.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new AppError(409, 'PHONE_TAKEN', 'Ce numéro est déjà inscrit');

  const user = await prisma.user.create({
    data: {
      fullName: body.fullName,
      phone,
      passwordHash: await bcrypt.hash(body.password, 10),
    },
  });

  // Préparer la vérification du téléphone
  const verif = await sendVerificationOtp(phone);

  res.status(201).json({
    user: publicUser(user),
    token: signToken(user),
    verification: verif, // sandboxCode présent uniquement en dev
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const body = z
    .object({ phone: z.string().min(8), password: z.string().min(1) })
    .parse(req.body);

  const phone = normalizePhone(body.phone);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw unauthorized('Numéro ou mot de passe incorrect');
  }

  res.json({ user: publicUser(user), token: signToken(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// PUT /api/auth/me — mise à jour du profil (nom, avatar)
router.put('/me', requireAuth, async (req, res) => {
  const body = z
    .object({
      fullName: z.string().min(2).optional(),
      avatarUrl: z.string().optional().nullable(),
    })
    .parse(req.body);

  const data = {};
  if (body.fullName !== undefined) data.fullName = body.fullName;
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl;

  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ user: publicUser(user) });
});

// POST /api/auth/request-verify — renvoyer un code OTP
router.post('/request-verify', requireAuth, async (req, res) => {
  const verif = await sendVerificationOtp(req.user.phone);
  res.json({ sent: verif.sent, expiresAt: verif.expiresAt, sandboxCode: verif.sandboxCode ?? null });
});

// POST /api/auth/verify — confirmer son téléphone avec le code OTP
router.post('/verify', requireAuth, async (req, res) => {
  const body = z.object({ code: z.string().length(6) }).parse(req.body);
  await verifyOtp(req.user.phone, body.code);
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json({ user: publicUser(user) });
});

export default router;