import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Avatar, VerifiedBadge, Spinner, Empty } from '../components/Ui.jsx';

const monthLabel = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
};

const period = (e) => `${monthLabel(e.startDate)} — ${e.current ? "Aujourd'hui" : monthLabel(e.endDate) || '…'}`;

const yearPeriod = (ed) => {
  if (ed.startYear && ed.endYear) return `${ed.startYear} — ${ed.endYear}`;
  if (ed.startYear) return `${ed.startYear} — ${ed.current ? "Aujourd'hui" : '…'}`;
  return null;
};

export default function ProProfile() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    api(`/api/profiles/${id}`, { token })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="page container"><Empty icon="⚠️" title="Profil introuvable" text={error} /></div>;
  if (!data) return <div className="page"><Spinner /></div>;

  const p = data.profile;
  const isOwner = token && user?.id === p.id;
  const hasContent = p.bio || p.experiences?.length || p.educations?.length || p.skills?.length || p.openJobs?.length;

  return (
    <div className="pro-page">
      <div className="no-print">
        <div className="pro-cover" />
        <div className="container pro-head">
          <Avatar url={p.avatarUrl} name={p.fullName} size={104} />
          <div className="pro-head-info">
            <h1>{p.fullName} <VerifiedBadge verified={p.phoneVerified} /></h1>
            {p.headline ? <p className="pro-headline">{p.headline}</p> : null}
            <div className="profile-meta">
              {p.sector ? <span>🏢 {p.sector}</span> : null}
              {p.city ? <span>📍 {p.city}</span> : null}
              {p.website ? <span>🌐 <a href={p.website} target="_blank" rel="noreferrer">{p.website.replace(/^https?:\/\//, '')}</a></span> : null}
            </div>
          </div>
        </div>

        <div className="container pro-actions">
          <button type="button" className="btn btn-outline" onClick={() => window.print()}>📄 Télécharger le CV (PDF)</button>
          {isOwner ? (
            <>
              <Link to="/profil/modifier" className="btn btn-primary">✏️ Modifier mon profil</Link>
              <Link to="/mon-compte" className="btn btn-ghost">Mon compte</Link>
            </>
          ) : token ? (
            <Link to={`/messagerie?to=${p.id}`} className="btn btn-primary">💬 Contacter</Link>
          ) : (
            <Link to="/connexion" className="btn btn-primary">💬 Contacter</Link>
          )}
        </div>

        {!hasContent ? (
          <div className="container">
            <div className="section-box">
              <Empty
                icon="👤"
                title={isOwner ? 'Complétez votre profil professionnel' : 'Ce profil professionnel est vide'}
                text={isOwner ? 'Ajoutez votre parcours, vos compétences et votre CV pour booster votre visibilité.' : 'L’utilisateur n’a pas encore renseigné son parcours.'}
              />
              {isOwner ? <div className="center"><Link to="/profil/modifier" className="btn btn-primary">Renseigner mon profil</Link></div> : null}
            </div>
          </div>
        ) : (
          <div className="container pro-sections">
            {p.bio ? (
              <section className="section-box">
                <h2>À propos</h2>
                <p className="pro-bio">{p.bio}</p>
              </section>
            ) : null}

            {p.experiences?.length ? (
              <section className="section-box">
                <h2>Expériences professionnelles</h2>
                <div className="pro-timeline">
                  {p.experiences.map((e) => (
                    <div key={e.id} className="pro-item">
                      <div className="pro-item-dot" />
                      <div className="pro-item-body">
                        <strong>{e.title}</strong>
                        <div className="pro-company">{e.company}{e.city ? ` · ${e.city}` : ''}</div>
                        <div className="muted small">{period(e)}</div>
                        {e.description ? <p className="pro-desc">{e.description}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {p.educations?.length ? (
              <section className="section-box">
                <h2>Formation</h2>
                <div className="pro-timeline">
                  {p.educations.map((ed) => (
                    <div key={ed.id} className="pro-item">
                      <div className="pro-item-dot" />
                      <div className="pro-item-body">
                        <strong>{ed.school}</strong>
                        <div className="pro-company">{[ed.degree, ed.field].filter(Boolean).join(' · ') || '—'}</div>
                        {yearPeriod(ed) ? <div className="muted small">{yearPeriod(ed)}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {p.skills?.length ? (
              <section className="section-box">
                <h2>Compétences</h2>
                <div className="chips">
                  {p.skills.map((s) => (
                    <span key={s.id} className={`chip${s.level >= 4 ? ' chip-link' : ''}`}>{s.name}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {p.openJobs?.length ? (
              <section className="section-box">
                <h2>Offres d'emploi publiées ({p.openOffers})</h2>
                <div className="pro-jobs">
                  {p.openJobs.map((o) => (
                    <Link key={o.id} to={`/emplois/${o.id}`} className="pro-job">
                      <div>
                        <strong>{o.title}</strong>
                        <div className="muted small">{o.contractType}{o.city ? ` · 📍 ${o.city}` : ''}{o.remote ? ' · 🌐 À distance' : ''}</div>
                      </div>
                      <span className="btn-link">Voir →</span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {p.provider && p.provider.status === 'APPROVED' ? (
              <section className="section-box">
                <h2>Prestataire de services</h2>
                <p className="muted">{p.provider.fullName} propose aussi des prestations sur Prestata.</p>
                <Link to={`/prestataire/${p.provider.id}`} className="btn btn-outline">Voir le profil prestataire</Link>
              </section>
            ) : null}
          </div>
        )}
      </div>

      {/* CV imprimable */}
      <div className="cv-print">
        <div className="cv-head">
          <h1>{p.fullName}</h1>
          {p.headline ? <div className="cv-headline">{p.headline}</div> : null}
          <div className="cv-contact">
            {p.sector ? <span>{p.sector}</span> : null}
            {p.city ? <span>📍 {p.city}</span> : null}
            {p.website ? <span>{p.website.replace(/^https?:\/\//, '')}</span> : null}
          </div>
        </div>

        {p.bio ? (
          <section>
            <h2>À propos</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{p.bio}</p>
          </section>
        ) : null}

        {p.experiences?.length ? (
          <section>
            <h2>Expériences professionnelles</h2>
            {p.experiences.map((e) => (
              <div key={e.id} className="cv-entry">
                <strong>{e.title}</strong> — <span className="cv-sub">{e.company}{e.city ? ` · ${e.city}` : ''}</span>
                <div className="cv-period">{period(e)}</div>
                {e.description ? <p>{e.description}</p> : null}
              </div>
            ))}
          </section>
        ) : null}

        {p.educations?.length ? (
          <section>
            <h2>Formation</h2>
            {p.educations.map((ed) => (
              <div key={ed.id} className="cv-entry">
                <strong>{ed.school}</strong>
                <div className="cv-sub">{[ed.degree, ed.field].filter(Boolean).join(' · ') || '—'}</div>
                {yearPeriod(ed) ? <div className="cv-period">{yearPeriod(ed)}</div> : null}
              </div>
            ))}
          </section>
        ) : null}

        {p.skills?.length ? (
          <section>
            <h2>Compétences</h2>
            <p>{p.skills.map((s) => s.name).join(' · ')}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}