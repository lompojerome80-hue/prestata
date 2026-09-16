import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, errMsg, fmtDate, JOB_CONTRACT_LABELS, JOB_APPLICATION_STATUS, JOB_STATUS } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Avatar, Empty, StatusPill } from '../components/Ui.jsx';

function whatsapp(phone) {
  return `https://wa.me/${(phone || '').replace(/[^\d]/g, '')}`;
}

export default function JobDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [applyMessage, setApplyMessage] = useState('');
  const [applyContact, setApplyContact] = useState('');
  const [respondBusy, setRespondBusy] = useState('');

  const load = () =>
    api(`/api/jobs/${id}`, { token })
      .then((d) => setJob(d.job))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  const apply = async () => {
    if (applyMessage.trim().length < 10) {
      setError('Décrivez votre motivation en au moins 10 caractères.');
      return;
    }
    setBusy(true);
    try {
      await api(`/api/jobs/${id}/apply`, {
        method: 'POST',
        token,
        body: { message: applyMessage, contact: applyContact || null },
      });
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const respond = async (appId, decision) => {
    if (!window.confirm(decision === 'ACCEPTED' ? 'Accepter cette candidature ?' : 'Rejeter cette candidature ?')) return;
    setRespondBusy(appId);
    try {
      await api(`/api/jobs/${id}/applications/${appId}/respond`, {
        method: 'POST',
        token,
        body: { decision },
      });
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setRespondBusy('');
    }
  };

  const closeOffer = async () => {
    if (!window.confirm('Clôturer cette offre ? Les candidatures ne seront plus acceptées.')) return;
    try {
      await api(`/api/jobs/${id}`, { method: 'PATCH', token, body: { status: 'CLOSED' } });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async () => {
    if (!window.confirm('Supprimer définitivement cette offre et ses candidatures ?')) return;
    try {
      await api(`/api/jobs/${id}`, { method: 'DELETE', token });
      navigate('/emplois');
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (!job && !error) return <div className="page"><div className="spinner" style={{ margin: '48px auto' }} /></div>;
  if (!job && error) return <div className="page container narrow"><Alert tone="error">{error}</Alert></div>;

  const expired = job.deadline && new Date(job.deadline) < new Date();
  const pendingApps = (job.applications || []).filter((a) => a.status === 'PENDING').length;

  return (
    <div className="page container narrow">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="job-hero">
        <div className="job-hero-top">
          <StatusPill status={job.status} map={JOB_STATUS} />
          <div className="job-hero-badges">
            <span className="pill pill-solid">{JOB_CONTRACT_LABELS[job.contractType]}</span>
            {job.remote ? <span className="pill pill-info">Télétravail</span> : null}
          </div>
        </div>
        <h1>{job.title}</h1>
        <p className="job-company muted">{job.company}</p>
        <div className="job-meta">
          {job.salary ? <span className="chip">💰 {job.salary}</span> : null}
          {job.city ? <span className="chip">📍 {job.city}</span> : null}
          {job.category ? <span className="chip">🏷️ {job.category.name}</span> : null}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>
          Publié le {fmtDate(job.createdAt)} • {job.applicantCount} candidature{job.applicantCount > 1 ? 's' : ''}
          {job.deadline ? (expired ? ' • Candidatures fermées' : ` • Postulez avant le ${fmtDate(job.deadline)}`) : ''}
        </p>
      </div>

      <section className="section-box">
        <h2>Description du poste</h2>
        <div className="job-desc multiline">{job.description}</div>
      </section>

      {/* ====== Vue auteur / admin : candidatures ====== */}
      {job.canManage ? (
        <>
          <div className="section-head">
            <h2>Candidatures ({job.applications?.length || 0})</h2>
            <Link to={`/emplois/${job.id}/modifier`} className="btn btn-ghost small">Modifier l'offre</Link>
          </div>

          {pendingApps > 0 && job.status === 'OPEN' ? (
            <Alert tone="info">{pendingApps} candidature{pendingApps > 1 ? 's' : ''} en attente de réponse.</Alert>
          ) : null}

          {job.applications?.length ? (
            <div className="card-stack">
              {job.applications.map((a) => (
                <div key={a.id} className="card app-card">
                  <div className="app-card-head">
                    <Avatar url={null} name={a.applicant?.fullName} size={40} />
                    <div className="app-card-info">
                      <strong>{a.applicant?.fullName}</strong>
                      <div className="muted small">{a.applicant?.phone}</div>
                    </div>
                    <StatusPill status={a.status} map={JOB_APPLICATION_STATUS} />
                  </div>
                  <p className="job-desc multiline small">{a.message}</p>
                  <div className="app-card-foot">
                    {a.contact ? <span className="muted small">📎 {a.contact}</span> : null}
                    <div className="app-card-actions">
                      {a.applicant?.phone ? (
                        <a
                          className="btn btn-ghost small"
                          href={whatsapp(a.applicant.phone)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      {a.status === 'PENDING' ? (
                        <>
                          <button type="button" className="btn btn-primary small" disabled={!!respondBusy} onClick={() => respond(a.id, 'ACCEPTED')}>
                            ✔ Accepter
                          </button>
                          <button type="button" className="btn btn-outline small danger" disabled={!!respondBusy} onClick={() => respond(a.id, 'REJECTED')}>
                            ✖ Rejeter
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="📭" title="Aucune candidature" text="Partagez le lien de cette offre pour recevoir des candidatures." />
          )}

          <div className="dash-actions">
            {job.status === 'OPEN' ? (
              <button type="button" className="btn btn-outline" onClick={closeOffer}>Clôturer l'offre</button>
            ) : null}
            <button type="button" className="btn btn-ghost danger" onClick={remove}>Supprimer</button>
          </div>
        </>
      ) : (
        /* ====== Vue candidat ====== */
        <section className="section-box">
          {job.status === 'CLOSED' ? (
            <Alert tone="info">Cette offre est clôturée. Les candidatures ne sont plus acceptées.</Alert>
          ) : job.applied ? (
            <Alert tone="success">✅ Candidature envoyée ! L'entreprise vous répondra directement. Suivi dans <Link to="/tableau-de-bord">votre tableau de bord</Link>.</Alert>
          ) : !token ? (
            <div className="center" style={{ padding: '12px 0' }}>
              <h2>Intéressé par ce poste ?</h2>
              <p className="muted">Connectez-vous pour postuler en quelques secondes.</p>
              <Link to="/connexion" state={{ from: location.pathname }} className="btn btn-primary">Se connecter pour postuler</Link>
              <p className="muted small" style={{ marginTop: 10 }}>
                Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
              </p>
            </div>
          ) : expired ? (
            <Alert tone="warning">La date limite de candidature est dépassée pour cette offre.</Alert>
          ) : (
            <div className="form">
              <h2>Postuler à cette offre</h2>
              <label>
                Votre motivation
                <textarea
                  rows={5}
                  placeholder="Présentez-vous, votre expérience et pourquoi vous êtes le bon candidat…"
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                />
              </label>
              <label>
                Contact (optionnel — WhatsApp, lien CV/portfolio)
                <input
                  type="text"
                  placeholder="+229… ou lien vers votre CV"
                  value={applyContact}
                  onChange={(e) => setApplyContact(e.target.value)}
                />
              </label>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={apply}>
                {busy ? 'Envoi…' : 'Envoyer ma candidature'}
              </button>
              {user && !user.phoneVerified ? (
                <p className="muted small">💡 Confirmez votre numéro dans <Link to="/mon-compte">Mon compte</Link> pour pouvoir postuler.</p>
              ) : null}
            </div>
          )}
        </section>
      )}
    </div>
  );
}