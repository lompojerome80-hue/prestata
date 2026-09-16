import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES = [
  // DOMICILE (artisans)
  { name: 'Plomberie', slug: 'plomberie', kind: 'DOMICILE', icon: 'wrench', sortOrder: 10 },
  { name: 'Électricité', slug: 'electricite', kind: 'DOMICILE', icon: 'zap', sortOrder: 20 },
  { name: 'Maçonnerie', slug: 'maconnerie', kind: 'DOMICILE', icon: 'building', sortOrder: 30 },
  { name: 'Menuiserie', slug: 'menuiserie', kind: 'DOMICILE', icon: 'hammer', sortOrder: 40 },
  { name: 'Peinture', slug: 'peinture', kind: 'DOMICILE', icon: 'paint-bucket', sortOrder: 50 },
  { name: 'Couture', slug: 'couture', kind: 'DOMICILE', icon: 'scissors', sortOrder: 60 },
  { name: 'Coiffure & Beauté', slug: 'coiffure-beaute', kind: 'DOMICILE', icon: 'scissors', sortOrder: 70 },
  { name: 'Ménage & Entretien', slug: 'menage-entretien', kind: 'DOMICILE', icon: 'sparkles', sortOrder: 80 },
  { name: 'Jardinage', slug: 'jardinage', kind: 'DOMICILE', icon: 'leaf', sortOrder: 90 },
  { name: 'Cuisine & Traiteur', slug: 'cuisine-traiteur', kind: 'DOMICILE', icon: 'chef-hat', sortOrder: 100 },
  { name: 'Réparation Mobile & IT', slug: 'reparation-informatique', kind: 'DOMICILE', icon: 'smartphone', sortOrder: 110 },
  { name: 'Auto / Moto', slug: 'auto-moto', kind: 'DOMICILE', icon: 'car', sortOrder: 120 },
  // DIGITAL (freelances)
  { name: 'Design graphique', slug: 'design-graphique', kind: 'DIGITAL', icon: 'palette', sortOrder: 200 },
  { name: 'Rédaction', slug: 'redaction', kind: 'DIGITAL', icon: 'pen-tool', sortOrder: 210 },
  { name: 'Développement Web', slug: 'dev-web', kind: 'DIGITAL', icon: 'code', sortOrder: 220 },
  { name: 'Community Management', slug: 'community-management', kind: 'DIGITAL', icon: 'megaphone', sortOrder: 230 },
  { name: 'Marketing digital', slug: 'marketing-digital', kind: 'DIGITAL', icon: 'trending-up', sortOrder: 240 },
  { name: 'Traduction', slug: 'traduction', kind: 'DIGITAL', icon: 'globe', sortOrder: 250 },
  { name: 'Photographie', slug: 'photographie', kind: 'DIGITAL', icon: 'camera', sortOrder: 260 },
  { name: 'Vidéo & Montage', slug: 'video-montage', kind: 'DIGITAL', icon: 'video', sortOrder: 270 },
  { name: 'Formation en ligne', slug: 'formation-en-ligne', kind: 'DIGITAL', icon: 'book-open', sortOrder: 280 },
];

async function seedCategories() {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: {},
    });
  }
  const count = await prisma.category.count();
  console.log(`✅ ${count} catégories prêtes`);
}

// Comptes de démo — JAMALS en production (NODE_ENV=production) ; sinon si SEED_DEMO_USERS !== 'false'.
// L'admin de production est créé via ADMIN_PHONE/ADMIN_PASSWORD.
async function seedDemoUsers() {
  const pwd = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { phone: '+22991000001' },
    create: { fullName: 'Admin Prestata', phone: '+22991000001', passwordHash: pwd, isAdmin: true, phoneVerified: true },
    update: {},
  });

  const marie = await prisma.user.upsert({
    where: { phone: '+22991000002' },
    create: { fullName: 'Marie Akindo', phone: '+22991000002', passwordHash: pwd, phoneVerified: true },
    update: {},
  });

  const paul = await prisma.user.upsert({
    where: { phone: '+22991000003' },
    create: { fullName: 'Paul Koudjo', phone: '+22991000003', passwordHash: pwd, phoneVerified: true },
    update: {},
  });

  const aisha = await prisma.user.upsert({
    where: { phone: '+22991000004' },
    create: { fullName: 'Aïcha Dossou', phone: '+22991000004', passwordHash: pwd, phoneVerified: true },
    update: {},
  });

  const allCats = await prisma.category.findMany();
  const plomberieCat = allCats.find((c) => c.slug === 'plomberie');
  const electriciteCat = allCats.find((c) => c.slug === 'electricite');
  const devWebCat = allCats.find((c) => c.slug === 'dev-web');
  const designCat = allCats.find((c) => c.slug === 'design-graphique');

  const paulProfile = await prisma.providerProfile.upsert({
    where: { userId: paul.id },
    create: {
      userId: paul.id,
      headline: 'Plombier expérimenté à Cotonou',
      bio: "Plus de 10 ans d'expérience en plomberie résidentielle et commerciale.",
      city: 'Cotonou',
      neighborhood: 'Gbegamey',
      remoteOnly: false,
      rate: 15000,
      rateUnit: 'FORFAIT',
      status: 'APPROVED',
      verifiedBadge: true,
      ratingAvg: 4.7,
      ratingCount: 3,
    },
    update: {},
  });

  const aishaProfile = await prisma.providerProfile.upsert({
    where: { userId: aisha.id },
    create: {
      userId: aisha.id,
      headline: 'Développeuse Web Full Stack',
      bio: 'Développeuse React/Node.js, sites web et applications sur mesure, travail à distance.',
      remoteOnly: true,
      rate: 25000,
      rateUnit: 'JOUR',
      status: 'APPROVED',
      verifiedBadge: true,
      ratingAvg: 4.9,
      ratingCount: 2,
    },
    update: {},
  });

  await prisma.providerProfile.upsert({
    where: { userId: marie.id },
    create: {
      userId: marie.id,
      headline: 'Couturière & créatrice de mode',
      bio: 'Couture sur mesure, retouches, création de tenues traditionnelles et modernes.',
      city: 'Parakou',
      neighborhood: 'Centre-ville',
      remoteOnly: false,
      rate: 8000,
      rateUnit: 'SERVICE',
      status: 'PENDING', // Non validé (à valider via l'admin)
    },
    update: {},
  });

  if (plomberieCat) {
    await prisma.providerCategory.upsert({
      where: { providerId_categoryId: { providerId: paulProfile.id, categoryId: plomberieCat.id } },
      create: { providerId: paulProfile.id, categoryId: plomberieCat.id },
      update: {},
    });
  }
  if (electriciteCat) {
    await prisma.providerCategory.upsert({
      where: { providerId_categoryId: { providerId: paulProfile.id, categoryId: electriciteCat.id } },
      create: { providerId: paulProfile.id, categoryId: electriciteCat.id },
      update: {},
    });
  }
  if (devWebCat) {
    await prisma.providerCategory.upsert({
      where: { providerId_categoryId: { providerId: aishaProfile.id, categoryId: devWebCat.id } },
      create: { providerId: aishaProfile.id, categoryId: devWebCat.id },
      update: {},
    });
  }
  if (designCat) {
    await prisma.providerCategory.upsert({
      where: { providerId_categoryId: { providerId: aishaProfile.id, categoryId: designCat.id } },
      create: { providerId: aishaProfile.id, categoryId: designCat.id },
      update: {},
    });
  }

  // Portfolio (idempotent)
  const portfolioCount = await prisma.portfolioItem.count();
  if (portfolioCount === 0) {
    await prisma.portfolioItem.createMany({
      data: [
        { providerId: aishaProfile.id, type: 'LINK', url: 'https://github.com/aicha-dev', caption: 'GitHub' },
        { providerId: aishaProfile.id, type: 'LINK', url: 'https://portfolio-aicha.example.com', caption: 'Portfolio' },
        { providerId: paulProfile.id, type: 'LINK', url: 'https://google.com/maps/place/Cotonou', caption: "Zone d'intervention" },
      ],
    });
  }

  console.log('✅ Comptes de démo créés (mots de passe : 123456)');
  console.log(`   Admin : ${admin.phone} —— Client : ${marie.phone} —— Plombier : ${paul.phone} —— Freelance : ${aisha.phone}`);
}

async function main() {
  console.log('⏳ Seed en cours…');
  await seedCategories();
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_USERS !== 'false') {
    await seedDemoUsers();
  } else {
    console.log('ℹ️  Comptes de démo désactivés (production ou SEED_DEMO_USERS=false)');
  }
  console.log('✅ Seed terminé');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());