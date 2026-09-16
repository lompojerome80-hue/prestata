// Sérialisation des objets Prisma vers le front (exclusion de champs sensibles).

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    isAdmin: user.isAdmin,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export function providerSummary(p) {
  if (!p) return null;
  return {
    id: p.id,
    userId: p.userId,
    headline: p.headline,
    bio: p.bio,
    city: p.city,
    neighborhood: p.neighborhood,
    remoteOnly: p.remoteOnly,
    rate: p.rate,
    rateUnit: p.rateUnit,
    avatarUrl: p.avatarUrl || p.user?.avatarUrl || null,
    status: p.status,
    rejectionReason: p.rejectionReason,
    verifiedBadge: p.verifiedBadge,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    viewCount: p.viewCount,
    createdAt: p.createdAt,
    fullName: p.user?.fullName,
    user: p.user ? publicUser(p.user) : null,
    categories: (p.categories || []).map((pc) => pc.category || null).filter(Boolean)
      .map(catSummary),
    portfolioCount: p.portfolio?.length ?? 0,
  };
}

export function catSummary(cat) {
  return cat
    ? { id: cat.id, name: cat.name, slug: cat.slug, kind: cat.kind, icon: cat.icon }
    : null;
}

export function messageOut(m) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.sender?.fullName,
    body: m.body,
    createdAt: m.createdAt,
  };
}

export function quoteOut(q) {
  return {
    id: q.id,
    requestId: q.requestId,
    amount: q.amount,
    description: q.description,
    delayDays: q.delayDays,
    status: q.status,
    createdAt: q.createdAt,
    acceptedAt: q.acceptedAt,
  };
}

export function prestationOut(p) {
  if (!p) return null;
  return {
    id: p.id,
    requestId: p.requestId,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    completedAt: p.completedAt,
    paidAt: p.paidAt,
    reviewedAt: p.reviewedAt,
    createdAt: p.createdAt,
    clientId: p.clientId,
    providerId: p.providerId,
    providerName: p.provider?.user?.fullName,
    clientName: p.client?.fullName,
    requestTitle: p.request?.title,
  };
}