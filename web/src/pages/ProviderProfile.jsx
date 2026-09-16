import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, RATE_UNIT_LABELS, money, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Avatar, VerifiedBadge, Spinner, Empty, Alert } from '../components/Ui.jsx';

export default function ProviderProfile() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    api(`/api/providers/${id}`, { token })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="page container"><Empty icon="⚠️" title="Impossible d'afficher" text={error} /></div>;
  if (!data) return <div className="page"><Spinner /></div>;

  const p = data.provider;
  const images = (p.portfolio || []).filter((i) => i.type === 'IMAGE');
  const links = (p.portfolio || []).filter((i) => i.type === 'LINK');
  const unit = RATE_UNIT_LABELS[p.rateUnit];
  const reviews = p.reviews || [];
  const shownReviews = showAllReviews ? reviews : reviews.slice(0, 6);

  return (
    <div className="prov-page">
      <div className="prov-cover" />

      <div className="container prov-head">
        <div className="prov-avatar">
          <Avatar url={p.avatarUrl} name={p.fullName} size={112} />
        </div>

        <div className="prov-head-info">
          <h1>{p.fullName} <VerifiedBadge verified={p.verifiedBadge} /></h1>
          <p className="prov-headline">{p.headline || 'Prestataire sur Prestata'}</p>
          <div className="prov-meta">
            {(p.categories || []).map((c) => (
              <Link key={c.id} to={`/recherche?category=${c.slug}`} className="chip chip-link">{c.name}</Link>
            ))}
            <span className="prov-meta-item">📍 {p.remoteOnly ? 'À distance' : p.city || 'Localisation à préciser'}{p.neighborhood ? ` (${p.neighborhood})` : ''}</span>
          </div>
        </div>

        <div className="prov-rate-box">
          {p.rate != null ? (
            <>
              <div className="prov-rate">{money(p.rate)}</div>
              <div className="muted small">{unit ? `par ${unit.replace('/', '')}` : 'tarif indicatif'}</div>
            </>
          ) : (
            <div className="muted small">Tarif sur demande</div>
          )}
          <Link to={token ? `/prestataire/${p.id}/demande` : '/connexion'} className="btn btn-primary prov-cta">📋 Demander un devis</Link>
        </div>
      </div>

      <div className="container">
        <div className="prov-stat-bar">
          <div className="prov-stat">
            <span className="prov-stat-val">⭐ {p.ratingCount > 0 ? p.ratingAvg.toFixed(1) : '—'}/5</span>
            <span className="muted small">Note moyenne</span>
          </div>
          <div className="prov-stat">
            <span className="prov-stat-val">{p.ratingCount}</span>
            <span className="muted small">Avis</span>
          </div>
          <div className="prov-stat">
            <span className="prov-stat-val">{p.viewCount}</span>
            <span className="muted small">Vues du profil</span>
          </div>
          <div className="prov-stat">
            <span className="prov-stat-val">{p.remoteOnly ? '🌐' : (p.city || '📍')}</span>
            <span className="muted small">{p.remoteOnly ? 'Travaille à distance' : 'Zone d’intervention'}</span>
          </div>
        </div>

        {p.status === 'PENDING' || p.status === 'REJECTED' ? (
          <Alert tone="warning">
            {p.status === 'PENDING'
              ? 'Ce profil est en attente de validation par l’équipe.'
              : `Ce profil a été refusé : ${p.rejectionReason || 'motif non précisé'}.`}
          </Alert>
        ) : null}

        <div className="prov-actions">
          {token ? (
            <Link to={`/messagerie?to=${p.userId}`} className="btn btn-outline">💬 Contacter</Link>
          ) : (
            <Link to="/connexion" className="btn btn-outline">💬 Contacter</Link>
          )}
          {p.userId ? <Link to={`/profil/${p.userId}`} className="btn btn-ghost">👤 Profil professionnel & CV</Link> : null}
        </div>

        <div className="prov-sections">
          <section className="section-box">
            <h2>À propos</h2>
            <p className="pro-bio">{p.bio}</p>
          </section>

          {(images.length || links.length) ? (
            <section className="section-box">
              <h2>Réalisations</h2>
              {images.length ? (
                <div className="pro-portfolio">
                  {images.map((i) => (
                    <a key={i.id} href={i.url} target="_blank" rel="noreferrer" className="pro-portfolio-img">
                      <img src={i.url} alt={i.caption || p.headline || p.fullName} loading="lazy" />
                      {i.caption ? <span>{i.caption}</span> : null}
                    </a>
                  ))}
                </div>
              ) : null}
              {links.length ? (
                <div className="chips" style={{ marginTop: 10 }}>
                  {links.map((l) => (
                    <a key={l.id} className="chip chip-link" href={l.url} target="_blank" rel="noreferrer">
                      🔗 {l.caption || l.url.replace(/^https?:\/\//, '')}
                    </a>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="section-box">
            <h2>Avis clients</h2>
            {reviews.length ? (
              <>
                <div className="prov-reviews">
                  {shownReviews.map((r) => (
                    <div key={r.id} className="prov-review">
                      <div className="prov-review-quote">“</div>
                      <div className="prov-review-body">
                        <div className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                        {r.comment ? <p className="prov-review-text">{r.comment}</p> : <p className="muted">Avis sans commentaire.</p>}
                        <div className="prov-review-foot">
                          <strong>{r.authorName}</strong>
                          {r.requestTitle ? <span>· {r.requestTitle}</span> : null}
                          <span className="muted small">· {fmtDate(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {reviews.length > shownReviews.length ? (
                  <button type="button" className="btn btn-ghost small" onClick={() => setShowAllReviews(true)}>
                    Voir les {reviews.length} avis
                  </button>
                ) : null}
              </>
            ) : (
              <p className="muted">Pas encore d'avis. Soyez le premier !</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}