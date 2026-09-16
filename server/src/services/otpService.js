import { randomPin, sha256 } from '../utils/crypto.js';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';
import { sendSms } from './smsService.js';

// Stockage en mémoire (instance unique). Le code n'est jamais renvoyé au client en production.
const pendingVerifications = new Map(); // phone → { codeHash, expiresAt, attempts }
const MAX_ATTEMPTS = 5;

export async function sendVerificationOtp(phone) {
  const code = randomPin();
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  pendingVerifications.set(phone, { codeHash: sha256(code), expiresAt, attempts: 0 });

  if (config.isDev) {
    // Confort de développement uniquement : le code est retourné pour tester.
    return { sent: true, sandboxCode: code, expiresAt };
  }

  await sendSms({ to: phone, message: `[Prestata] Votre code de vérification : ${code}` });
  return { sent: true, sandboxCode: null, expiresAt };
}

export async function verifyOtp(phone, code) {
  const record = pendingVerifications.get(phone);
  if (!record) throw new AppError(400, 'OTP_NOT_SENT', "Demandez d'abord un code de vérification");
  if (record.expiresAt < new Date()) {
    pendingVerifications.delete(phone);
    throw new AppError(400, 'OTP_EXPIRED', 'Le code a expiré. Demandez-en un nouveau.');
  }
  if (sha256(code) !== record.codeHash) {
    record.attempts += 1;
    const remaining = MAX_ATTEMPTS - record.attempts;
    if (record.attempts >= MAX_ATTEMPTS) pendingVerifications.delete(phone);
    throw new AppError(
      400,
      'OTP_INVALID',
      remaining > 0 ? `Code incorrect (${remaining} essai(s) restant(s))` : 'Code incorrect. Demandez un nouveau code.',
    );
  }

  pendingVerifications.delete(phone);
  // Marquer l'utilisateur comme vérifié
  await prisma.user.update({ where: { phone }, data: { phoneVerified: true } });
  // Badge vérifié sur le profil prestataire si existant
  await prisma.providerProfile.updateMany({
    where: { user: { phone } },
    data: { verifiedBadge: true },
  });
  return true;
}