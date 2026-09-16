import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import { messageOut, publicUser } from '../utils/serialize.js';
import { notifyConversationParticipants } from '../services/notificationService.js';

const router = Router();

// POST /api/conversations — démarrer une conversation avec un user (ou la réutiliser)
router.post('/', requireAuth, async (req, res) => {
  const body = z.object({ userId: z.string().min(1) }).parse(req.body);
  if (body.userId === req.user.id) throw new AppError(400, 'SELF_CHAT', 'Vous ne pouvez pas dialoguer avec vous-même');

  const other = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!other) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable');

  // Chercher une conversation directe existante entre les deux
  const existing = await prisma.conversation.findFirst({
    where: {
      requestId: null,
      participants: { every: { userId: { in: [req.user.id, body.userId] } } },
    },
    include: { participants: true },
  });

  if (existing) {
    return res.json({ conversation: serializeConversation(existing) });
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: { create: [{ userId: req.user.id }, { userId: body.userId }] },
    },
    include: { participants: { include: { user: true } } },
  });
  res.status(201).json({ conversation: serializeConversation(conversation) });
});

// GET /api/conversations — conversations de l'utilisateur connecté
router.get('/', requireAuth, async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: req.user.id } },
    },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: true } },
      request: { select: { id: true, title: true, status: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ conversations: conversations.map(serializeConversation) });
});

// GET /api/conversations/:id — détail avec messages
router.get('/:id', requireAuth, async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: 'asc' }, include: { sender: true } },
      request: { select: { id: true, title: true, status: true } },
    },
  });
  if (!conversation) throw new AppError(404, 'NOT_FOUND', 'Conversation introuvable');
  const isParticipant = conversation.participants.some((p) => p.userId === req.user.id);
  if (!isParticipant && !req.user.isAdmin) throw new AppError(403, 'FORBIDDEN');

  // Marquer les messages comme lus
  await prisma.conversationParticipant.updateMany({
    where: { conversationId: conversation.id, userId: req.user.id },
    data: { lastReadAt: new Date() },
  });

  res.json({
    conversation: {
      id: conversation.id,
      request: conversation.request,
      participants: conversation.participants.map((p) => ({
        ...publicUser(p.user),
        lastReadAt: p.lastReadAt,
      })),
      messages: conversation.messages.map(messageOut),
    },
  });
});

// POST /api/conversations/:id/messages — envoyer un message
router.post('/:id/messages', requireAuth, async (req, res) => {
  const body = z.object({ body: z.string().min(1).max(4000) }).parse(req.body);

  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { participants: true },
  });
  if (!conversation) throw new AppError(404, 'NOT_FOUND', 'Conversation introuvable');
  if (!conversation.participants.some((p) => p.userId === req.user.id)) {
    throw new AppError(403, 'FORBIDDEN');
  }

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: req.user.id, body: body.body },
    include: { sender: true },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  await notifyConversationParticipants({
    conversationId: conversation.id,
    senderId: req.user.id,
    title: 'Nouveau message',
    message: `${req.user.fullName} : ${body.body.slice(0, 80)}${body.body.length > 80 ? '…' : ''}`,
    type: 'MESSAGE',
  });

  res.status(201).json({ message: messageOut(message) });
});

function serializeConversation(c) {
  const last = c.messages?.[0];
  return {
    id: c.id,
    requestId: c.requestId ?? null,
    request: c.request
      ? { id: c.request.id, title: c.request.title, status: c.request.status }
      : null,
    participants: (c.participants || []).map((p) => ({
      id: p.user.id,
      fullName: p.user.fullName,
      avatarUrl: p.user.avatarUrl,
    })),
    lastMessage: last
      ? { body: last.body, from: last.sender?.fullName, createdAt: last.createdAt }
      : null,
    updatedAt: c.updatedAt,
  };
}

export default router;