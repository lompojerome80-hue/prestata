import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Crée ou confirme le compte administrateur depuis les variables d'environnement
// ADMIN_PHONE (format international) et ADMIN_PASSWORD (min. 8 caractères).
// À exécuter au déploiement (Render → build), pas localement.

const prisma = new PrismaClient();
const phone = (process.env.ADMIN_PHONE || '').replace(/[\s-]/g, '');
const password = process.env.ADMIN_PASSWORD || '';

async function main() {
  if (!phone || !password) {
    console.log('ℹ️  ADMIN_PHONE / ADMIN_PASSWORD non définis — aucun administrateur créé.');
    return;
  }
  if (password.length < 8) {
    console.error('❌ ADMIN_PASSWORD doit contenir au moins 8 caractères.');
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { isAdmin: true, phoneVerified: true, passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`✅ Administrateur confirmé : ${phone}`);
  } else {
    await prisma.user.create({
      data: {
        fullName: 'Administrateur',
        phone,
        passwordHash: await bcrypt.hash(password, 10),
        isAdmin: true,
        phoneVerified: true,
      },
    });
    console.log(`✅ Administrateur créé : ${phone}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur admin:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());