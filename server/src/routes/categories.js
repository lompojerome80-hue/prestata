import { Router } from 'express';
import { prisma } from '../db.js';
import { catSummary } from '../utils/serialize.js';

const router = Router();

// GET /api/categories — liste des catégories (triée par ordre + nom)
router.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json({ categories: categories.map(catSummary) });
});

// GET /api/categories/top — catégories les plus demandées (back-office & homepage)
router.get('/top', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { requestCount: 'desc' },
    take: 10,
  });
  res.json({ categories: categories.map(catSummary) });
});

export default router;