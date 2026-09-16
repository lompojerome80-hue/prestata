import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AppError, forbidden, badRequest } from '../utils/errors.js';
import { randomToken } from '../utils/crypto.js';
import { notify } from '../services/notificationService.js';

const router = Router();

const CONTRACT_TYPES = ['CDI', 'CDD', 'FREELANCE', 'STAGE'];

const jobSchema = z.object({
  title: z.string().min(3).max(150),
  company: z.string().min(2).max(120),
  description: z.string().min(20).max(5000),
  contractType: z.enum(CONTRACT_TYPES).default('CDI'),
  salary: z.string().max(100).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  remote: z.boolean().default(false),
  categoryId: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
}).strict();

const applySchema = z.object({
  message: z.string().min(10).max(2000),
  contact: z.string().max(200).optional().nullable(),
}).strict();

function assertVerified(user) {
  if (!user.phoneVerified) {
    throw forbidden("Confirmez d'abord votre numéro de téléphone pour publier ou postuler (voir « Mon compte »).");
  }
}

export function serializeJobOffer(o) {
  return {
    id: o.id,
    reference: o.reference,
    title: o.title,
    company: o.company,
    description: o.description,
    contractType: o.contractType,
    salary: o.salary,
    city: o.city,
    remote: o.remote,
    category: o.category ? { id: o.category.id, name: o.category.name, slug: o.category.slug } : null,
    deadline: o.deadline,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    author: o.author ? { id: o.author.id, fullName: o.author.fullName } : null,
    applicantCount: o._count?.applications ?? o.applications?.length ?? 0,
  };
}

export function serializeJobApplication(a) {
  return {
    id: a.id,
    status: a.status,
    message: a.message,
    contact: a.contact,
    createdAt: a.createdAt,
    applicant: a.applicant ? { id: a.applicant.id, fullName: a.applicant.fullName, phone: a.applicant.phone } : null,
    job: a.jobOffer
      ? { id: a.jobOffer.id, title: a.jobOffer.title, company: a.jobOffer.company, status: a.jobOffer.status }
      : null,
  };
}

const listInclude = {
  author: { select: { id: true, fullName: true } },
  category: true,
  _count: { select: { applications: true } },
};

async function getOffer(id) {
  const offer = await prisma.jobOffer.findUnique({ where: { id }, include: listInclude });
  if (!offer) throw new AppError(404, 'NOT_FOUND', 'Offre d’emploi introuvable');
  return offer;
}

function canManage(user, offer) {
  return user && (user.id === offer.authorId || user.isAdmin);
}

// GET /api/jobs — liste publique des offres ouvertes
router.get('/', optionalAuth, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const categoryId = (req.query.categoryId || '').toString();
  const contractType = (req.query.contractType || '').toString();
  const remote = req.query.remote === '1' || req.query.remote === 'true';

  const offers = await prisma.jobOffer.findMany({
    where: {
      status: 'OPEN',
      ...(q ? { OR: [{ title: { contains: q } }, { company: { contains: q } }] } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(contractType ? { contractType } : {}),
      ...(req.query.remote ? { remote } : {}),
    },
    include: listInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  res.json({ jobs: offers.map(serializeJobOffer) });
});

// GET /api/jobs/mine — offres publiées par l'utilisateur connecté
router.get('/mine', requireAuth, async (req, res) => {
  const offers = await prisma.jobOffer.findMany({
    where: { authorId: req.user.id },
    include: { ...listInclude, applications: { include: { applicant: { select: { id: true, fullName: true, phone: true } } }, orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ jobs: offers.map((o) => ({ ...serializeJobOffer(o), applications: o.applications.map(serializeJobApplication) })) });
});

// GET /api/jobs/applications/mine — candidatures envoyées par l'utilisateur connecté
router.get('/applications/mine', requireAuth, async (req, res) => {
  const apps = await prisma.jobApplication.findMany({
    where: { applicantId: req.user.id },
    include: { jobOffer: { include: { category: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ applications: apps.map((a) => ({
    ...serializeJobApplication(a),
    job: a.jobOffer
      ? { id: a.jobOffer.id, title: a.jobOffer.title, company: a.jobOffer.company, status: a.jobOffer.status, category: a.jobOffer.category ? { id: a.jobOffer.category.id, name: a.jobOffer.category.name } : null }
      : null,
  })) });
});

// POST /api/jobs — publier une offre (utilisateur vérifié)
router.post('/', requireAuth, async (req, res) => {
  assertVerified(req.user);
  const body = jobSchema
    .omit({})
    .parse(req.body);

  if (body.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!cat) throw badRequest('Catégorie introuvable');
  }

  let deadline = null;
  if (body.deadline) {
    deadline = new Date(body.deadline);
    if (Number.isNaN(deadline.getTime())) throw badRequest('Date limite invalide');
  }

  const offer = await prisma.jobOffer.create({
    data: {
      reference: `JB-${randomToken(6).toUpperCase()}`,
      authorId: req.user.id,
      title: body.title,
      company: body.company,
      description: body.description,
      contractType: body.contractType,
      salary: body.salary || null,
      city: body.city || null,
      remote: body.remote,
      categoryId: body.categoryId || null,
      deadline,
    },
    include: listInclude,
  });

  res.status(201).json({ job: serializeJobOffer(offer) });
});

// GET /api/jobs/:id — détail public ; candidatures visibles par l'auteur/l'admin
router.get('/:id', optionalAuth, async (req, res) => {
  const offer = await getOffer(req.params.id);
  const isManager = canManage(req.user, offer);

  let applications = [];
  let applied = false;
  if (isManager) {
    applications = (await prisma.jobApplication.findMany({
      where: { jobOfferId: offer.id },
      include: { applicant: { select: { id: true, fullName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    })).map(serializeJobApplication);
  } else if (req.user) {
    applied = !!(await prisma.jobApplication.findUnique({
      where: { jobOfferId_applicantId: { jobOfferId: offer.id, applicantId: req.user.id } },
    }));
  }

  res.json({
    job: { ...serializeJobOffer(offer), applications, canManage: isManager, applied },
  });
});

// PATCH /api/jobs/:id — modifier / clôturer (auteur ou admin)
router.patch('/:id', requireAuth, async (req, res) => {
  const offer = await getOffer(req.params.id);
  if (!canManage(req.user, offer)) throw forbidden("Seul l'auteur de l'offre peut la modifier");

  const updates = jobSchema.partial().extend({ status: z.enum(['OPEN', 'CLOSED']).optional() }).parse(req.body);
  const data = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.company !== undefined) data.company = updates.company;
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.contractType !== undefined) data.contractType = updates.contractType;
  if (updates.salary !== undefined) data.salary = updates.salary || null;
  if (updates.city !== undefined) data.city = updates.city || null;
  if (updates.remote !== undefined) data.remote = updates.remote;
  if (updates.categoryId !== undefined) data.categoryId = updates.categoryId || null;
  if (updates.deadline !== undefined) {
    data.deadline = updates.deadline ? new Date(updates.deadline) : null;
    if (data.deadline && Number.isNaN(data.deadline.getTime())) throw badRequest('Date limite invalide');
  }
  if (updates.status !== undefined) data.status = updates.status;

  const updated = await prisma.jobOffer.update({
    where: { id: offer.id },
    data,
    include: listInclude,
  });
  res.json({ job: serializeJobOffer(updated) });
});

// DELETE /api/jobs/:id — supprimer (auteur ou admin)
router.delete('/:id', requireAuth, async (req, res) => {
  const offer = await getOffer(req.params.id);
  if (!canManage(req.user, offer)) throw forbidden("Seul l'auteur de l'offre peut la supprimer");
  await prisma.jobOffer.delete({ where: { id: offer.id } });
  res.json({ ok: true });
});

// POST /api/jobs/:id/apply — candidater (utilisateur vérifié, une fois par offre)
router.post('/:id/apply', requireAuth, async (req, res) => {
  assertVerified(req.user);
  const offer = await getOffer(req.params.id);
  if (offer.authorId === req.user.id) throw badRequest("Vous ne pouvez pas postuler à votre propre offre");
  if (offer.status !== 'OPEN') throw badRequest('Cette offre est fermée');

  const body = applySchema.parse(req.body);
  const applicant = await prisma.user.findUnique({ where: { id: req.user.id } });

  try {
    const application = await prisma.jobApplication.create({
      data: {
        jobOfferId: offer.id,
        applicantId: req.user.id,
        message: body.message,
        contact: body.contact || null,
      },
      include: { applicant: { select: { id: true, fullName: true, phone: true } } },
    });

    await notify({
      userId: offer.authorId,
      title: 'Nouvelle candidature',
      message: `${applicant.fullName} a postulé à votre offre « ${offer.title} »`,
      type: 'INFO',
    });

    res.status(201).json({ application: serializeJobApplication(application) });
  } catch (e) {
    if (e.code === 'P2002') {
      throw new AppError(409, 'ALREADY_APPLIED', 'Vous avez déjà postulé à cette offre');
    }
    throw e;
  }
});

// POST /api/jobs/:id/applications/:appId/respond — accepter/rejeter (auteur ou admin)
router.post('/:id/applications/:appId/respond', requireAuth, async (req, res) => {
  const offer = await getOffer(req.params.id);
  if (!canManage(req.user, offer)) throw forbidden("Seul l'auteur de l'offre peut traiter les candidatures");

  const { decision } = z.object({ decision: z.enum(['ACCEPTED', 'REJECTED']) }).parse(req.body);
  const app = await prisma.jobApplication.findFirst({ where: { id: req.params.appId, jobOfferId: offer.id } });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Candidature introuvable');

  const updated = await prisma.jobApplication.update({
    where: { id: app.id },
    data: { status: decision },
    include: { jobOffer: { include: { category: true } }, applicant: { select: { id: true, fullName: true, phone: true } } },
  });

  await notify({
    userId: app.applicantId,
    title: decision === 'ACCEPTED' ? 'Candidature acceptée 🎉' : 'Candidature refusée',
    message: decision === 'ACCEPTED'
      ? `${offer.company} a accepté votre candidature pour « ${offer.title} »`
      : `${offer.company} n'a pas retenu votre candidature pour « ${offer.title} »`,
    type: 'INFO',
  });

  res.json({ application: serializeJobApplication(updated) });
});

export default router;