import { Router } from 'express';
import { prisma } from '../db.js';
import { providerSummary, catSummary } from '../utils/serialize.js';

const router = Router();

// GET /api/search?category=<slug>&q=<texte>&city=<ville>&mode=DOMICILE|DIGITAL&page=1
router.get('/', async (req, res) => {
  const { category, q, city, mode, page = 1 } = req.query;
  const pageSize = 12;
  const skip = (Math.max(1, Number(page) || 1) - 1) * pageSize;

  const where = { status: 'APPROVED' };

  if (mode === 'DOMICILE' || mode === 'DIGITAL') {
    if (mode === 'DIGITAL') {
      where.remoteOnly = true;
    } else if (mode === 'DOMICILE') {
      where.remoteOnly = false;
    }
  }

  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (cat) {
      where.categories = { some: { categoryId: cat.id } };
      if (cat.kind === 'DIGITAL') where.remoteOnly = true;
    } else {
      return res.json({ providers: [], total: 0, page: 1, categories: [] });
    }
  }

  if (city) {
    where.city = { contains: String(city).trim() };
  }

  if (q) {
    where.OR = [
      { headline: { contains: String(q).trim() } },
      { bio: { contains: String(q).trim() } },
      { user: { fullName: { contains: String(q).trim() } } },
    ];
  }

  const [providers, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      include: {
        user: true,
        categories: { include: { category: true } },
        portfolio: { select: { id: true } },
      },
      orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.providerProfile.count({ where }),
  ]);

  res.json({
    providers: providers.map(providerSummary),
    total,
    page: Number(page) || 1,
    pageSize,
  });
});

export default router;