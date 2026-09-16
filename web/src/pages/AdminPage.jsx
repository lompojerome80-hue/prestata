import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg, fmtDate, money, JOB_STATUS } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Avatar, Empty, Spinner, StatusPill, VerifiedBadge } from '../components/Ui.jsx';

export default function AdminPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState('pending');
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api('/api/admin/stats', { token }),
      api('/api/admin/providers/pending', { token }),
      api('/api/admin/providers', { token }),
      api('/api/admin/jobs', { token }),
    ])
      .then(([s, p, all, jobs]) => {
        setStats(s);
        setPending(p.providers || []);
        setAllProviders(all.providers || []);
        setAllJobs(jobs.jobs || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (id, status, reason) => {
    setActionBusy(id);
    try {
      await api(`/api/admin/providers/${id}/decision`, { method: 'POST', token, body: { status, reason: reason || null } });
      load();
    } catch (e) { setError(errMsg(e)); }
    finally { setActionBusy(null); }
  };

  const deleteJob = async (id) => {
    if (!window.confirm('Supprimer cette offre d\'emploi et toutes ses candidatures ?')) return;
    setActionBusy(id);
    try {
      await api(`/api/jobs/${id}`, { method: 'DELETE', token });
      load();
    } catch (e) { setError(errMsg(e)); }
    finally { setActionBusy(null); }
  };

  if (loading) return <div className="page"><Spinner /></div>;

  return (
    <div className="page container">
      <h1>Administration</h1>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {/* Stats */}
      {stats ? (
        <section className="section-box">
          <h2>Aperçu</h2>
          <div className="admin-stats">
            <div className="stat-card"><div className="stat-val">{stats.pendingCount}</div><div className="muted small">En attente</div></div>
            <div className="stat-card"><div className="stat-val">{stats.providersCount}</div><div className="muted small">Prestataires</div></div>
            <div className="stat-card"><div className="stat-val">{stats.usersCount}</div><div className="muted small">Utilisateurs</div></div>
            <div className="stat-card"><div className="stat-val">{stats.prestationsCount}</div><div className="muted small">Prestations</div></div>
            <div className="stat-card"><div className="stat-val">{stats.offersCount ?? '—'}</div><div className="muted small">Offres d'emploi</div></div>
            <div className="stat-card"><div className="stat-val">{stats.applicationsCount ?? '—'}</div><div className="muted small">Candidatures</div></div>
          </div>
          {stats.topCategories?.length ? (
            <div className="topcat-list" style={{ marginTop: 12 }}>
              {stats.topCategories.map((c, i) => (
                <span key={c.id} className="topcat">
                  <span className="topcat-rank">{i + 1}</span>
                  <span className="topcat-name">{c.name}</span>
                  <span className="muted small">{c.requestCount} demandes</span>
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="admin-tabs">
        <button type="button" className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>
          En attente ({pending.length})
        </button>
        <button type="button" className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
          Tous ({allProviders.length})
        </button>
        <button type="button" className={tab === 'jobs' ? 'on' : ''} onClick={() => setTab('jobs')}>
          Emplois ({allJobs.length})
        </button>
      </div>

      {tab === 'pending' && (
        <section className="section-box">
          <h2>Profils en attente de validation</h2>
          {pending.length === 0 ? (
            <Empty icon="✅" title="Tout est à jour" text="Aucun profil en attente." />
          ) : (
            <div className="admin-list">
              {pending.map((p) => (
                <div key={p.id} className="admin-provider">
                  <Avatar url={p.avatarUrl} name={p.fullName} size={48} />
                  <div className="admin-provider-info">
                    <div>
                      <strong>{p.fullName}</strong> <VerifiedBadge verified={p.verifiedBadge} />
                      <span className="muted small">{p.headline}</span>
                    </div>
                    <p className="muted small clamp-2">{p.bio}</p>
                    <div className="chips">
                      {(p.categories || []).map((c) => <span key={c.id} className="chip">{c.name}</span>)}
                    </div>
                    <div className="muted small">
                      {p.city ? `📍 ${p.city}` : '🌐 À distance'} {p.rate != null ? `• ${money(p.rate)}` : ''}
                    </div>
                  </div>
                  <div className="admin-actions">
                    <button className="btn btn-primary small" disabled={actionBusy === p.id} onClick={() => decide(p.id, 'APPROVED')}>
                      {actionBusy === p.id ? '…' : '✅ Approuver'}
                    </button>
                    <button className="btn btn-ghost small" disabled={actionBusy === p.id} onClick={() => {
                      const reason = prompt('Motif du refus (optionnel) :');
                      decide(p.id, 'REJECTED', reason);
                    }}>
                      ❌ Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'all' && (
        <section className="section-box">
          <h2>Tous les profils prestataires</h2>
          <div className="admin-list">
            {allProviders.map((p) => (
              <div key={p.id} className="admin-provider">
                <Avatar url={p.avatarUrl} name={p.fullName} size={48} />
                <div className="admin-provider-info">
                  <strong>{p.fullName}</strong>
                  <span className="muted small">{p.headline}</span>
                  <span className="muted small">
                    {p.status === 'APPROVED' ? '✅ Publié' : p.status === 'REJECTED' ? '❌ Refusé' : '⏳ En attente'}
                  </span>
                </div>
                <Link to={`/prestataire/${p.id}`} className="btn btn-ghost small">Voir</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'jobs' && (
        <section className="section-box">
          <h2>Toutes les offres d'emploi</h2>
          {allJobs.length === 0 ? (
            <Empty icon="💼" title="Aucune offre" text="Aucune offre d'emploi publiée pour le moment." />
          ) : (
            <div className="admin-list">
              {allJobs.map((o) => (
                <div key={o.id} className="admin-provider">
                  <div className="admin-provider-info">
                    <strong>{o.title} <StatusPill status={o.status} map={JOB_STATUS} /></strong>
                    <span className="muted small">{o.company} • {o.author?.fullName} ({o.authorPhone}) • {fmtDate(o.createdAt)}</span>
                    <span className="muted small">{o.applicantCount} candidature{o.applicantCount > 1 ? 's' : ''}{o.city ? ` • 📍 ${o.city}` : ''}</span>
                  </div>
                  <div className="admin-actions">
                    <Link to={`/emplois/${o.id}`} className="btn btn-ghost small">Voir</Link>
                    <button className="btn btn-ghost small danger" disabled={actionBusy === o.id} onClick={() => deleteJob(o.id)}>
                      {actionBusy === o.id ? '…' : '🗑 Supprimer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}