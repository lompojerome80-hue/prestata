import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 4010;
const BASE = `http://localhost:${PORT}`;
const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json };
};

const log = (label, status, extra = '') =>
  console.log(`${status === 200 || status === 201 ? '✅' : '❌'} ${label} → ${status} ${extra}`);

// Démarre le serveur sur un port dédié
const server = spawn('node', ['src/index.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', (d) => (logs += d.toString()));
server.stderr.on('data', (d) => (logs += d.toString()));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Attend que le serveur soit prêt
let ready = false;
for (let i = 0; i < 30; i++) {
  await sleep(400);
  try {
    const res = await fetch(`${BASE}/api/health`);
    if (res.ok) { ready = true; break; }
  } catch { /* not yet */ }
}
if (!ready) {
  console.error('Serveur non démarré:\n', logs);
  server.kill();
  process.exit(1);
}

(async () => {
  // 1. Login admin
  let r = await api('/api/auth/login', { method: 'POST', body: { phone: '+22991000001', password: '123456' } });
  log('Login admin', r.status);
  const adminToken = r.json?.token;

  // 2. Liste des catégories
  r = await api('/api/categories');
  log('Catégories', r.status, `(${r.json?.categories?.length} éléments)`);

  // 3. Recherche (plombier à Cotonou)
  r = await api('/api/search?category=plomberie&city=Cotonou');
  log('Recherche plombier Cotonou', r.status, `(${r.json?.total} résultats)`);

  // 4. Rejet / approbation pending -> via admin
  r = await api('/api/admin/providers/pending', { token: adminToken });
  log('Admin: profils pending', r.status, `(${r.json?.providers?.length})`);

  // 5. Stats admin
  r = await api('/api/admin/stats', { token: adminToken });
  log('Admin: stats', r.status, `(pending=${r.json?.pendingCount})`);

  // 6. Fiche publique d'un prestataire APPROVED (Paul = plombier)
  const search = await api('/api/search?category=plomberie');
  const paulProvider = search.json?.providers?.[0];
  if (paulProvider) {
    r = await api(`/api/providers/${paulProvider.id}`);
    log('Fiche prestataire publié', r.status);
    if (r.json?.provider?.status === 'NOT_PUBLISHED') log('  (erreur de serial)','-');
  }

  // 7. Login client Marie (a un profil PENDING "à elle" ? non, Marie est client)
  r = await api('/api/auth/login', { method: 'POST', body: { phone: '+22991000002', password: '123456' } });
  log('Login Marie (client)', r.status);
  const marieToken = r.json?.token;

  // 8. Créer une demande (plombier)
  if (paulProvider) {
    r = await api('/api/requests', {
      method: 'POST',
      token: marieToken,
      body: {
        providerId: paulProvider.id,
        title: 'Fuite d\'eau sous l\'évier',
        description: 'J\'ai une fuite d\'eau sous l\'évier de la cuisine qui s\'aggrave.',
        kind: 'ARTISAN',
        urgency: 'TODAY',
        city: 'Cotonou',
      },
    });
    log('Créer demande', r.status);

    // 9. Le prestataire envoie un devis
    const paulLogin = await api('/api/auth/login', { method: 'POST', body: { phone: '+22991000003', password: '123456' } });
    const paulToken = paulLogin.json?.token;

    const requestId = r.json?.request?.id;
    if (requestId) {
      r = await api(`/api/requests/${requestId}/quotes`, {
        method: 'POST',
        token: paulToken,
        body: { amount: 12000, description: 'Remplacement du joint', delayDays: 1 },
      });
      log('Envoyer devis', r.status);

      // 10. Le client accepte le devis → prestation créée
      const quoteId = r.json?.quote?.id;
      if (quoteId) {
        r = await api(`/api/quotes/${quoteId}/accept`, { method: 'POST', token: marieToken });
        log('Accepter devis → prestation', r.status, r.json?.prestation ? `(id=${r.json?.prestation?.id})` : '');

        const prestationId = r.json?.prestation?.id;

        // 11. Prestataire marque la prestation terminée
        r = await api(`/api/prestations/${prestationId}/complete`, { method: 'POST', token: paulToken });
        log('Prestataire termine', r.status);

        // 12. Client initie le paiement (sandbox)
        r = await api(`/api/prestations/${prestationId}/pay`, {
          method: 'POST',
          token: marieToken,
          body: { provider: 'ORANGE_MONEY', phone: '+22991000002' },
        });
        log('Initier paiement', r.status, r.json?.sandbox ? `(sandboxOtp=${r.json?.sandboxOtp})` : '');

        const paymentId = r.json?.payment?.id;
        // 13. Confirmer paiement en sandbox
        if (paymentId) {
          r = await api(`/api/payments/${paymentId}/confirm`, {
            method: 'POST',
            token: marieToken,
            body: { otp: r.json?.sandboxOtp || '000000' },
          });
          log('Confirmer paiement', r.status, `(status=${r.json?.payment?.status})`);

          // 14. Client note la prestation
          r = await api(`/api/prestations/${prestationId}/review`, {
            method: 'POST',
            token: marieToken,
            body: { rating: 5, comment: 'Excellent travail, rapide et propre !' },
          });
          log('Noter la prestation', r.status);
        }

        // 15. Vérifier la règle de confiance : nouvelle demande bloquée si pas encore notée ?
        // (déjà notée ici, donc doit passer)
        r = await api('/api/requests', {
          method: 'POST',
          token: marieToken,
          body: {
            providerId: paulProvider.id,
            title: 'Installer un mitigeur',
            description: 'Besoin d\'installer un nouveau mitigeur de douche.',
            kind: 'ARTISAN',
            city: 'Cotonou',
          },
        });
        log('Nouvelle demande après avis', r.status);
      }
    }
  }

  // ==================== BOURSE D'EMPLOI ====================
  const ok = (label, isOk, extra = '') =>
    console.log(`${isOk ? '✅' : '❌'} ${label} → ${extra}`);

  const cats = await api('/api/categories');
  const paulLogin = await api('/api/auth/login', { method: 'POST', body: { phone: '+22991000003', password: '123456' } });
  const paulToken = paulLogin.json?.token;

  // 16. Marie (client vérifié) publie une offre d'emploi
  r = await api('/api/jobs', {
    method: 'POST',
    token: marieToken,
    body: {
      title: 'Développeur Web front-end',
      company: 'Agence Nova',
      description: 'Nous recherchons un développeur front-end pour un site vitrine et une boutique en ligne.',
      contractType: 'FREELANCE',
      salary: '250 000 FCFA / projet',
      city: 'Cotonou',
      remote: true,
      categoryId: cats.json?.categories?.[0]?.id,
    },
  });
  log('Publier offre d’emploi', r.status);
  const jobId = r.json?.job?.id;

  if (jobId) {
    // 17. Liste publique des offres
    r = await api('/api/jobs');
    log('Liste des offres', r.status, `(${r.json?.jobs?.length} offres)`);

    // 18. Détail (public, pas encore appliqué)
    r = await api(`/api/jobs/${jobId}`);
    log('Détail offre', r.status, `(applied=${r.json?.job?.applied})`);

    // 19. Paul (prestataire) postule
    const paulApply = await api(`/api/jobs/${jobId}/apply`, {
      method: 'POST',
      token: paulToken,
      body: { message: 'Bonjour, développeur front-end avec 4 ans d\'expérience, je suis intéressé par votre offre.', contact: '+22991000003 (WhatsApp)' },
    });
    log('Postuler à l’offre', paulApply.status);
    const appId = paulApply.json?.application?.id;

    // 20. Double candidature → 409
    r = await api(`/api/jobs/${jobId}/apply`, {
      method: 'POST',
      token: paulToken,
      body: { message: 'Je me permets de re-postuler.' },
    });
    ok('Double candidature bloquée (409)', r.status === 409, `reçu ${r.status}`);

    // 21. L'auteur voit les candidatures (canManage)
    if (appId) {
      r = await api(`/api/jobs/${jobId}`, { token: marieToken });
      log('Auteur: candidatures visibles', r.status, `(${r.json?.job?.applications?.length})`);

      // 22. L'auteur accepte la candidature
      r = await api(`/api/jobs/${jobId}/applications/${appId}/respond`, {
        method: 'POST',
        token: marieToken,
        body: { decision: 'ACCEPTED' },
      });
      log('Accepter candidature', r.status, `(status=${r.json?.application?.status})`);
    }

    // 23. Candidatures de Paul
    r = await api('/api/jobs/applications/mine', { token: paulToken });
    log('Mes candidatures', r.status, `(${r.json?.applications?.length})`);

    // 24. Clôturer l'offre
    r = await api(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      token: marieToken,
      body: { status: 'CLOSED' },
    });
    log('Clôturer l’offre', r.status, `(status=${r.json?.job?.status})`);

    // 25. Impossible d'apply à une offre fermée (ou de postuler à sa propre offre) → 400
    r = await api(`/api/jobs/${jobId}/apply`, {
      method: 'POST',
      token: marieToken,
      body: { message: 'Test sur offre fermée.' },
    });
    ok('Candidature sur offre fermée bloquée (400)', r.status === 400, `reçu ${r.status}`);
  }

  // ==================== PROFIL PROFESSIONNEL (CV) ====================
  const marieUser = marieToken ? (await api('/api/auth/me', { token: marieToken })).json?.user : null;

  // 26. Mettre à jour le profil professionnel de Marie (expériences, formation, compétences)
  r = await api('/api/profiles/me', {
    method: 'PUT',
    token: marieToken,
    body: {
      headline: 'Directrice de projets digitaux',
      bio: 'Passionnée par le digital et le développement d\'entreprises locales.',
      city: 'Cotonou',
      sector: 'Services numériques',
      website: 'https://exemple.bj',
      experiences: [
        { title: 'Directrice de projets', company: 'Agence Nova', city: 'Cotonou', startDate: '2020-01', current: true, description: 'Pilotage de projets web et mobile.' },
        { title: 'Chef de projet', company: 'Studio Web', city: 'Cotonou', startDate: '2016-03', endDate: '2019-12', current: false, description: 'Suivi de bout en bout des projets clients.' },
      ],
      educations: [
        { school: 'Université d\'Abomey-Calavi', degree: 'Master', field: 'Informatique de gestion', startYear: 2011, endYear: 2015 },
      ],
      skills: ['Gestion de projet', 'Marketing digital', 'Rédaction web'],
    },
  });
  log('Mettre à jour profil professionnel', r.status);
  const marieProfile = r.json?.profile;

  // 27. Relire via /api/profiles/me
  r = await api('/api/profiles/me', { token: marieToken });
  log('Relire profil (me)', r.status, `(exp=${r.json?.profile?.experiences?.length}, skills=${r.json?.profile?.skills?.length})`);

  // 28. Profil public visible pour les visiteurs anonymes
  if (marieUser?.id) {
    r = await api(`/api/profiles/${marieUser.id}`);
    log('Profil public', r.status, `(headline=${r.json?.profile?.headline}, openOffers=${r.json?.profile?.openOffers})`);
  }

  // 29. Profil d'un autre utilisateur (Paul) sans lui avoir rien rempli → 200
  const paulUser = (await api('/api/auth/me', { token: paulToken })).json?.user;
  if (paulUser?.id) {
    r = await api(`/api/profiles/${paulUser.id}`);
    log('Profil public (autre user)', r.status, `(bio=${r.json?.profile?.bio ?? 'vide'})`);
  }

  // 30. cvPublic=false masque le profil aux anonymes, mais reste visible pour le propriétaire
  await api('/api/profiles/me', { method: 'PUT', token: paulToken, body: { cvPublic: false, headline: 'Plombier senior' } });
  r = await api(`/api/profiles/${paulUser.id}`);
  ok('Profil privé masqué aux anonymes', r.status === 404, `reçu ${r.status}`);
  r = await api(`/api/profiles/me`, { token: paulToken });
  ok('Profil privé visible par le propriétaire', r.status === 200, `reçu ${r.status}`);
  await api('/api/profiles/me', { method: 'PUT', token: paulToken, body: { cvPublic: true } });

  console.log('\n--- Fin du test ---');
  server.kill();
  process.exit(0);
})().catch((e) => {
  console.error('Erreur smoke:', e);
  server.kill();
  process.exit(1);
});