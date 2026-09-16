import { randomPin, sha256 } from '../utils/crypto.js';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';

// Stockage en mémoire pour le MVP (à remplacer par un service SMS en prod).
const pendingVerifications = new Map(); // phone → { codeHash, expiresAt }

/**
 * Envoyer un code OTP de vérification de téléphone.
 * En sandbox, le code est retourné dans la réponse.
 */
export async function sendVerificationOtp(phone) {
  const code = randomPin();
  const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 min
  pendingVerifications.set(phone, { codeHash: sha256(code), expiresAt });

  // TODO: en prod, appeler Twilio / l'API SMS locale ici
  if (config.paymentsSandbox) {
    return { sent: true, sandboxCode: code, expiresAt };
  }
  return { sent: true, sandboxCode: null, expiresAt };
}

/**
 * Vérifier le code OTP pour un téléphone donné.
 */
export async function verifyOtp(phone, code) {
  const record = pendingVerifications.get(phone);
  if (!record) throw new AppError(400, 'OTP_NOT_SENT', 'Demandez d\'abord un code de vérification');
  if (record.expiresAt < new Date()) {
    pendingVerifications.delete(phone);
    throw new AppError(400, 'OTP_EXPIRED', 'Le code a expiré. Demandez-en un nouveau.');
  }
  if (sha256(code) !== record.codeHash) {
    throw new AppError(400, 'OTP_INVALID', 'Code incorrect');
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