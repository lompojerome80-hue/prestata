import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmtDate, JOB_CONTRACT_LABELS } from '../api.js';
import { Spinner } from '../components/Ui.jsx';

export default function Home() {
  const [categories, setCategories] = useState(null);
  const [topCats, setTopCats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [cat, setCat] = useState('');
  const [mode, setMode] = useState('');

  useEffect(() => {
    api('/api/categories').then((d) => setCategories(d.categories));
    api('/api/categories/top').then((d) => setTopCats(d.categories));
    api('/api/jobs').then((d) => setJobs((d.jobs || []).slice(0, 3))).catch(() => {});
  }, []);

  const hasLocal = (categories || []).filter((c) => c.kind !== 'DIGITAL');
  const hasRemote = (categories || []).filter((c) => c.kind === 'DIGITAL');

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (cat) params.set('category', cat);
    if (city) params.set('city', city);
    if (mode) params.set('mode', mode);
    if (q) params.set('q', q);
    navigate(`/recherche?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="container hero-inner">
          <h1>
            Trouvez le bon <em>artisan</em>
            <br />
            ou <em>freelance</em>, en 2 minutes.
          </h1>
          <p className="muted">
            Plomberie, électricité, couture, design, développement… Comparez les notes,
            demandez un devis et payez en toute confiance.
          </p>

          <form className="search-box" onSubmit={submit}>
            <div className="search-row">
              <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Catégorie">
                <option value="">Toutes catégories</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Ville ou quartier (ex : Cotonou…)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Rechercher</button>
            </div>
            <div className="search-modes">
              <label className={mode === '' ? 'mode on' : 'mode'}>
                <input type="radio" name="mode" checked={mode === ''} onChange={() => setMode('')} />
                Tous
              </label>
              <label className={mode === 'DOMICILE' ? 'mode on' : 'mode'}>
                <input type="radio" name="mode" checked={mode === 'DOMICILE'} onChange={() => setMode('DOMICILE')} />
                🏠 À domicile
              </label>
              <label className={mode === 'DIGITAL' ? 'mode on' : 'mode'}>
                <input type="radio" name="mode" checked={mode === 'DIGITAL'} onChange={() => setMode('DIGITAL')} />
                🌐 À distance
              </label>
            </div>
          </form>
        </div>
      </section>

      {/* Catégories */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Explorer par catégorie</h2>
            <Link to="/recherche" className="btn btn-ghost">Tout voir</Link>
          </div>

          {!categories ? (
            <Spinner />
          ) : (
            <>
              <h3 className="cat-group-title">🏠 Artisans à domicile</h3>
              <div className="cat-grid">
                {hasLocal.slice(0, 8).map((c) => (
                  <Link key={c.id} to={`/recherche?category=${c.slug}`} className="cat-card">
                    <div className="cat-icon">{c.icon}</div>
                    <div className="cat-name">{c.name}</div>
                    <div className="cat-kind muted small">À domicile</div>
                  </Link>
                ))}
              </div>

              <h3 className="cat-group-title">💻 Freelances à distance</h3>
              <div className="cat-grid">
                {hasRemote.slice(0, 8).map((c) => (
                  <Link key={c.id} to={`/recherche?category=${c.slug}&mode=DIGITAL`} className="cat-card">
                    <div className="cat-icon">{c.icon}</div>
                    <div className="cat-name">{c.name}</div>
                    <div className="cat-kind muted small">À distance</div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Offres d'emploi */}
      {jobs.length ? (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2>💼 Dernières offres d'emploi</h2>
              <div>
                <Link to="/emplois" className="btn btn-ghost">Toutes les offres</Link>{' '}
                <Link to="/emplois/nouvelle" className="btn btn-primary">Publier une offre</Link>
              </div>
            </div>
            <div className="job-grid">
              {jobs.map((j) => (
                <Link key={j.id} to={`/emplois/${j.id}`} className="card job-card">
                  <div className="job-card-head">
                    <div className="job-card-title">
                      <h3 className="clamp-1">{j.title}</h3>
                      <span className="pill">
                        {JOB_CONTRACT_LABELS[j.contractType] || j.contractType}
                      </span>
                    </div>
                    <div className="muted small job-company">{j.company}</div>
                  </div>
                  <p className="job-desc clamp-2">{j.description}</p>
                  <div className="job-meta">
                    {j.salary ? <span className="chip">💰 {j.salary}</span> : null}
                    {j.city ? <span className="chip">📍 {j.city}</span> : null}
                    {j.deadline && new Date(j.deadline) > new Date() ? (
                      <span className="chip chip-warn">⏳ avant le {fmtDate(j.deadline)}</span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Comment ça marche */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="center">Comment ça marche ?</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Recherchez</h3>
              <p className="muted">Par catégorie, ville et note moyenne. Profils vérifiés et validés.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Demandez un devis</h3>
              <p className="muted">Décrivez votre besoin, ajoutez une photo, choisissez l'urgence.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>Payez en confiance</h3>
              <p className="muted">Paiement mobile sécurisé une fois le travail terminé (Orange Money / Moov Money).</p>
            </div>
            <div className="step">
              <div className="step-num">4</div>
              <h3>Notez</h3>
              <p className="muted">Laissez un avis : c'est comme ça que la plateforme reste fiable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Top demandes */}
      {topCats && topCats.length ? (
        <section className="section">
          <div className="container">
            <h2>Catégories les plus demandées</h2>
            <div className="topcat-list">
              {topCats.map((c, i) => (
                <Link key={c.id} to={`/recherche?category=${c.slug}`} className="topcat">
                  <span className="topcat-rank">{i + 1}</span>
                  <span className="topcat-name">{c.name}</span>
                  <span className="muted small">{c.requestCount} demandes</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="section cta">
        <div className="container cta-inner">
          <h2>Vous êtes artisan ou freelance ?</h2>
          <p className="muted">Créez votre profil en 5 minutes et recevez vos premières demandes.</p>
          <Link to="/inscription" className="btn btn-secondary">Devenir prestataire</Link>
        </div>
      </section>
    </div>
  );
}