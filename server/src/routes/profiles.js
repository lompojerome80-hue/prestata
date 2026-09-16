import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { providerSummary } from '../utils/serialize.js';
import { notFound } from '../utils/errors.js';

const router = Router();

const monthStr = z.string().regex(/^\d{4}-\d{2}$/, 'Format attendu : AAAA-MM');
const toDate = (s) => new Date(`${s}-01T00:00:00.000Z`);
const month = (d) => (d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` : null);

// Sérialisation du profil professionnel (public).
function professionalProfile(u) {
  if (!u) return null;
  return {
    id: u.id,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    phoneVerified: u.phoneVerified,
    headline: u.headline,
    bio: u.bio,
    city: u.city,
    sector: u.sector,
    website: u.website,
    cvPublic: u.cvPublic,
    experiences: (u.experiences || []).map((e) => ({
      id: e.id,
      title: e.title,
      company: e.company,
      city: e.city,
      startDate: month(e.startDate),
      endDate: e.endDate ? month(e.endDate) : null,
      current: e.current,
      description: e.description,
    })),
    educations: (u.educations || []).map((ed) => ({
      id: ed.id,
      school: ed.school,
      degree: ed.degree,
      field: ed.field,
      startYear: ed.startYear,
      endYear: ed.endYear,
      current: ed.current,
    })),
    skills: (u.skills || []).map((s) => ({ id: s.id, name: s.name, level: s.level })),
    provider: u.providerProfile ? providerSummary(u.providerProfile) : null,
    openOffers: u._count?.jobOffers ?? 0,
    openJobs: (u.jobOffers || []),
  };
}

const loadProfile = (id, { owner = false } = {}) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      phoneVerified: true,
      phone: owner,
      headline: true,
      bio: true,
      city: true,
      sector: true,
      website: true,
      cvPublic: true,
      experiences: { orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] },
      educations: { orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] },
      skills: { orderBy: { name: 'asc' } },
      providerProfile: {
        include: { user: true, categories: { include: { category: true } }, portfolio: true },
      },
      _count: { select: { jobOffers: true } },
      jobOffers: {
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, contractType: true, city: true, remote: true, createdAt: true },
      },
    },
  });

// GET /api/profiles/me — profil détaillé du compte connecté (édition).
router.get('/me', requireAuth, async (req, res) => {
  const u = await loadProfile(req.user.id, { owner: true });
  res.json({ profile: professionalProfile(u) });
});

// GET /api/profiles/:userId — profil professionnel public (visible si cvPublic).
router.get('/:userId', optionalAuth, async (req, res) => {
  const u = await loadProfile(req.params.userId);
  if (!u) throw notFound('Profil introuvable');
  if (!u.cvPublic && (!req.user || req.user.id !== u.id)) throw notFound('Profil introuvable');
  res.json({ profile: professionalProfile(u) });
});

// PUT /api/profiles/me — mettre à jour le profil professionnel + expériences + formations + compétences.
router.put('/me', requireAuth, async (req, res) => {
  const schema = z
    .object({
      headline: z.string().trim().max(150).optional().nullable(),
      bio: z.string().trim().max(5000).optional().nullable(),
      city: z.string().trim().max(80).optional().nullable(),
      sector: z.string().trim().max(80).optional().nullable(),
      website: z.string().trim().max(200).optional().nullable(),
      cvPublic: z.boolean().optional(),
      experiences: z
        .array(
          z
            .object({
              title: z.string().trim().min(1, 'Intitulé requis').max(120),
              company: z.string().trim().min(1, 'Entreprise requise').max(120),
              city: z.string().trim().max(80).optional().nullable(),
              startDate: monthStr,
              endDate: monthStr.optional().nullable(),
              current: z.boolean().optional().default(false),
              description: z.string().trim().max(3000).optional().nullable(),
            })
            .strict(),
        )
        .max(30)
        .optional(),
      educations: z
        .array(
          z
            .object({
              school: z.string().trim().min(1, 'École requise').max(120),
              degree: z.string().trim().max(120).optional().nullable(),
              field: z.string().trim().max(120).optional().nullable(),
              startYear: z.number().int().min(1950).max(2100).optional().nullable(),
              endYear: z.number().int().min(1950).max(2100).optional().nullable(),
              current: z.boolean().optional().default(false),
            })
            .strict(),
        )
        .max(30)
        .optional(),
      skills: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
    })
    .strict()
    .parse(req.body);

  const data = {};
  for (const k of ['headline', 'bio', 'city', 'sector', 'website', 'cvPublic']) {
    if (schema[k] !== undefined) data[k] = schema[k] ?? null;
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) await tx.user.update({ where: { id: req.user.id }, data });

    if (schema.experiences) {
      await tx.experience.deleteMany({ where: { userId: req.user.id } });
      if (schema.experiences.length) {
        await tx.experience.createMany({
          data: schema.experiences.map((e, i) => ({
            userId: req.user.id,
            title: e.title,
            company: e.company,
            city: e.city,
            startDate: toDate(e.startDate),
            endDate: e.endDate ? toDate(e.endDate) : null,
            current: e.current,
            description: e.description,
            order: i,
          })),
        });
      }
    }

    if (schema.educations) {
      await tx.education.deleteMany({ where: { userId: req.user.id } });
      if (schema.educations.length) {
        await tx.education.createMany({
          data: schema.educations.map((ed, i) => ({
            userId: req.user.id,
            school: ed.school,
            degree: ed.degree,
            field: ed.field,
            startYear: ed.startYear,
            endYear: ed.endYear,
            current: ed.current,
            order: i,
          })),
        });
      }
    }

    if (schema.skills) {
      await tx.skill.deleteMany({ where: { userId: req.user.id } });
      const uniq = [...new Map(schema.skills.map((s) => [s.toLowerCase(), s])).values()];
      if (uniq.length) {
        await tx.skill.createMany({ data: uniq.map((name) => ({ userId: req.user.id, name })) });
      }
    }
  });

  const u = await loadProfile(req.user.id, { owner: true });
  res.json({ profile: professionalProfile(u) });
});

export const professionalProfileOut = professionalProfile;

export default router;