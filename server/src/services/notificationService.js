import { prisma } from '../db.js';

/**
 * Créer une notification pour un utilisateur.
 */
export async function notify({ userId, title, message, type = 'INFO' }) {
  return prisma.notification.create({
    data: { userId, title, message, type },
  });
}

/**
 * Notifier les deux participants d'une conversation (exclure l'auteur si connu).
 */
export async function notifyConversationParticipants({ conversationId, senderId, title, message, type }) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  const ids = participants.map((p) => p.userId).filter((id) => id !== senderId);
  for (const userId of ids) {
    await notify({ userId, title, message, type });
  }
}