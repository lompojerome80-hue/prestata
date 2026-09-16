// Meta SEO (title/description/og) par page, robots + sitemap.
export const SITE_URL = 'https://prestata.onrender.com';

export function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function abs(url) {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : SITE_URL + url;
}

export function applySeo(html, meta) {
  let out = html
    .replace(/<title>.*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/(<meta name="description" content=").*?(")/, `$1${esc(meta.description)}$2`)
    .replace(/(<meta property="og:title" content=").*?(")/, `$1${esc(meta.title)}$2`)
    .replace(/(<meta property="og:description" content=").*?(")/, `$1${esc(meta.description)}$2`)
    .replace(/(<meta property="og:type" content=").*?(")/, `$1${meta.type || 'website'}$2`);
  if (meta.url) {
    out = out.replace(/(<meta property="og:url" content=").*?(")/, `$1${SITE_URL + meta.url}$2`);
  }
  if (meta.image) {
    const img = esc(abs(meta.image));
    if (/<meta property="og:image"/.test(out)) {
      out = out.replace(/(<meta property="og:image" content=").*?(")/, `$1${img}$2`);
    } else {
      out = out.replace('<meta property="og:site_name"', `<meta property="og:image" content="${img}" />\n    <meta property="og:site_name"`);
    }
  }
  return out;
}

// Retourne { title, description, image, url } pour une route publique, ou null.
export async function seoMeta(path, prisma) {
  if (!prisma) return null;

  let m = path.match(/^\/profil\/([^/]+)\/?$/);
  if (m) {
    const user = await prisma.user.findUnique({
      where: { id: m[1] },
      select: {
        id: true, fullName: true, headline: true, bio: true, city: true, sector: true, avatarUrl: true, cvPublic: true,
        providerProfile: {
          select: { status: true, ratingAvg: true, ratingCount: true, categories: { select: { category: { select: { name: true } } } } },
        },
        _count: { select: { experiences: true, skills: true } },
      },
    });
    if (!user || !user.cvPublic) return null;
    const bits = [user.headline, user.city, user.sector].filter(Boolean).join(' · ');
    let description = (bits ? bits + '. ' : '') + (user.bio || '').slice(0, 160);
    if (!description.trim()) description = 'Profil professionnel sur Prestata.';
    if (user.providerProfile?.status === 'APPROVED') {
      description = `⭐ ${user.providerProfile.ratingAvg.toFixed(1)}/5 (${user.providerProfile.ratingCount} avis). ` + description;
    }
    const title = `${user.fullName}${user.headline ? ' — ' + user.headline : ''} | Prestata`;
    return { title, description: description.trim(), image: user.avatarUrl, url: `/profil/${user.id}`, type: 'profile' };
  }

  m = path.match(/^\/prestataire\/([^/]+)\/?$/);
  if (m) {
    const p = await prisma.providerProfile.findUnique({
      where: { id: m[1] },
      select: {
        id: true, status: true, headline: true, bio: true, city: true, ratingAvg: true, ratingCount: true, avatarUrl: true,
        user: { select: { fullName: true } },
        categories: { select: { category: { select: { name: true } } } },
      },
    });
    if (!p || p.status !== 'APPROVED') return null;
    const cats = p.categories.map((c) => c.category.name).join(', ');
    const desc = `⭐ ${p.ratingAvg.toFixed(1)}/5 (${p.ratingCount} avis). ${p.headline}${p.city ? ' — ' + p.city : ''}${cats ? ` — ${cats}` : ''}. ${(p.bio || '').slice(0, 120)}`;
    return { title: `${p.user.fullName} — ${p.headline} | Prestata`, description: desc.trim(), image: p.avatarUrl || null, url: `/prestataire/${p.id}` };
  }

  m = path.match(/^\/emplois\/([^/]+)\/?$/);
  if (m && m[1] !== 'nouvelle') {
    const job = await prisma.jobOffer.findUnique({
      where: { id: m[1] },
      select: { id: true, title: true, company: true, city: true, contractType: true, description: true, status: true },
    });
    if (!job || job.status !== 'OPEN') return null;
    const bits = [job.company, job.city, job.contractType].filter(Boolean).join(' · ');
    const description = `${bits ? bits + '. ' : ''}${(job.description || '').slice(0, 160)}`.trim();
    const title = `${job.title}${job.company ? ' — ' + job.company : ''} | Emploi | Prestata`;
    return { title, description, image: null, url: `/emplois/${job.id}` };
  }

  return null;
}

export function renderRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

// Sitemap XML : pages statiques + catégories + prestataires publiés + offres ouvertes + profils publics.
export async function renderSitemap(prisma) {
  const urls = [];
  const now = new Date().toISOString();
  const push = (loc, lastmod = now, priority = 0.5) => urls.push(`  <url><loc>${esc(SITE_URL + loc)}</loc><lastmod>${esc(lastmod)}</lastmod><priority>${priority}</priority></url>`);

  const statiques = ['/', '/recherche', '/emplois', '/comment-ca-marche', '/devenir-prestataire', '/inscription', '/mention-legales'];
  for (const s of statiques) push(s, now, s === '/' ? 1 : 0.6);

  const [categories, providers, jobs, users] = await Promise.all([
    prisma.category.findMany({ select: { slug: true } }),
    prisma.providerProfile.findMany({ where: { status: 'APPROVED' }, take: 500, select: { id: true, updatedAt: true, user: { select: { id: true } } } }),
    prisma.jobOffer.findMany({ where: { status: 'OPEN' }, take: 500, select: { id: true, updatedAt: true } }),
    prisma.user.findMany({ where: { cvPublic: true }, take: 500, select: { id: true, updatedAt: true } }),
  ]);

  for (const c of categories) push(`/recherche?category=${c.slug}`, now, 0.4);
  for (const p of providers) { push(`/prestataire/${p.id}`, p.updatedAt, 0.7); if (p.user) push(`/profil/${p.user.id}`, p.updatedAt, 0.4); }
  for (const j of jobs) push(`/emplois/${j.id}`, j.updatedAt, 0.8);
  for (const u of users) push(`/profil/${u.id}`, u.updatedAt, 0.3);

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}