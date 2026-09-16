import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, RATE_UNIT_LABELS, money, fmtDate } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Avatar, VerifiedBadge, Stars, Spinner, Empty, Alert } from '../components/Ui.jsx';

export default function ProviderProfile() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

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

  const isOwner = token && p.userId === p.user?.id;
  void isOwner;

  return (
    <div className="page container">
      {/* En-tête du profil */}
      <div className="profile-head">
        <Avatar url={p.avatarUrl} name={p.fullName} size={96} />
        <div className="profile-head-info">
          <h1>{p.fullName} <VerifiedBadge verified={p.verifiedBadge} /></h1>
          <p className="muted" style={{ fontSize: 16 }}>{p.headline}</p>
          <div className="profile-meta">
            <Stars rating={p.ratingAvg} count={p.ratingCount} />
            <span>📍 {p.remoteOnly ? 'à distance' : p.city || '—'}{p.neighborhood ? ` (${p.neighborhood})` : ''}</span>
            <span>👁 {p.viewCount} vues</span>
          </div>
          <div className="chips">
            {(p.categories || []).map((c) => (
              <Link key={c.id} to={`/recherche?category=${c.slug}`} className="chip chip-link">{c.name}</Link>
            ))}
          </div>
        </div>
        <div className="profile-rate-box">
          {p.rate != null ? (
            <>
              <div className="profile-rate">{money(p.rate)}</div>
              <div className="muted small">Tarif indicatif {RATE_UNIT_LABELS[p.rateUnit] || ''}</div>
            </>
          ) : (
            <div className="muted">Tarif sur demande</div>
          )}
        </div>
      </div>

      {p.status === 'PENDING' || p.status === 'REJECTED' ? (
        <Alert tone="warning">
          {p.status === 'PENDING'
            ? 'Ce profil est en attente de validation par l’équipe.'
            : `Ce profil a été refusé : ${p.rejectionReason || 'motif non précisé'}.`}
        </Alert>
      ) : null}

      {/* Actions */}
      <div className="profile-actions">
        {token ? (
          <>
            <Link to={`/prestataire/${p.id}/demande`} className="btn btn-primary">📋 Demander un devis</Link>
            <Link to={`/messagerie?to=${p.userId}`} className="btn btn-outline">💬 Contacter</Link>
          </>
        ) : (
          <>
            <Link to="/connexion" className="btn btn-primary">📋 Demander un devis</Link>
            <Link to="/connexion" className="btn btn-outline">💬 Contacter</Link>
          </>
        )}
      </div>

      {/* Bio */}
      <section className="section-box">
        <h2>À propos</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{p.bio}</p>
      </section>

      {/* Portfolio */}
      {(images.length || links.length) ? (
        <section className="section-box">
          <h2>Portfolio</h2>
          {images.length ? (
            <div className="portfolio">
              {images.map((i) => (
                <a key={i.id} href={i.url} target="_blank" rel="noreferrer" className="portfolio-item">
                  <img src={i.url} alt={i.caption || 'Portfolio'} />
                </a>
              ))}
            </div>
          ) : null}
          {links.length ? (
            <div className="chips">
              {links.map((l) => (
                <a key={l.id} className="chip chip-link" href={l.url} target="_blank" rel="noreferrer">
                  🔗 {l.caption || l.url}
                </a>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Avis */}
      <section className="section-box">
        <h2>Avis ({p.ratingCount})</h2>
        {p.reviews?.length ? (
          <div className="reviews">
            {p.reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="review-head">
                  <Stars rating={r.rating} />
                  <span className="muted small">{r.authorName}</span>
                  <span className="muted small">{fmtDate(r.createdAt)}</span>
                </div>
                {r.comment ? <p>{r.comment}</p> : null}
                {r.requestTitle ? <div className="muted small">À propos de : {r.requestTitle}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Pas encore d'avis. Soyez le premier !</p>
        )}
      </section>
    </div>
  );
}