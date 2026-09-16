import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmtDate, JOB_CONTRACT_LABELS } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Empty, Spinner, StatusPill } from '../components/Ui.jsx';

export default function Jobs() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [jobs, setJobs] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [contract, setContract] = useState('');
  const [remote, setRemote] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/categories').then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  const load = (params) => {
    setLoading(true);
    api(`/api/jobs${params ? `?${params}` : ''}`)
      .then((d) => setJobs(d.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat) params.set('categoryId', cat);
    if (contract) params.set('contractType', contract);
    if (remote) params.set('remote', '1');
    load(params.toString());
  };

  return (
    <div className="page container">
      <div className="section-head">
        <div>
          <h1>💼 Offres d'emploi</h1>
          <p className="muted">Publiez une offre ou trouvez votre prochain emploi, contrat ou mission freelance.</p>
        </div>
        {token ? (
          <Link to="/emplois/nouvelle" className="btn btn-primary">➕ Publier une offre</Link>
        ) : (
          <Link to="/connexion" className="btn btn-primary">➕ Publier une offre</Link>
        )}
      </div>

      <form className="filter-bar" onSubmit={submit}>
        <input
          type="text"
          placeholder="Poste, entreprise…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Catégorie">
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={contract} onChange={(e) => setContract(e.target.value)} aria-label="Type de contrat">
          <option value="">Tous types</option>
          {Object.entries(JOB_CONTRACT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <label className="filter-check">
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
          Télétravail
        </label>
        <button type="submit" className="btn btn-primary">Filtrer</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setQ(''); setCat(''); setContract(''); setRemote(true); load(); }}>
          Réinitialiser
        </button>
      </form>

      {loading ? (
        <Spinner />
      ) : jobs && jobs.length ? (
        <div className="job-grid">
          {jobs.map((j) => {
            const expired = j.deadline && new Date(j.deadline) < new Date();
            return (
              <Link key={j.id} to={`/emplois/${j.id}`} className="card job-card">
                <div className="job-card-head">
                  <div className="job-card-title">
                    <h3 className="clamp-1">{j.title}</h3>
                    <StatusPill status={j.contractType} map={Object.fromEntries(Object.entries(JOB_CONTRACT_LABELS).map(([k, v]) => [k, { label: v, color: '#0d9488' }]))} />
                  </div>
                  <div className="muted small job-company">{j.company}</div>
                </div>
                <p className="job-desc clamp-2">{j.description}</p>
                <div className="job-meta">
                  {j.salary ? <span className="chip">💰 {j.salary}</span> : null}
                  {j.city ? <span className="chip">📍 {j.city}</span> : null}
                  {j.remote ? <span className="chip chip-info">🌐 Télétravail</span> : null}
                  <span className="chip">{j.applicantCount} candidature{j.applicantCount > 1 ? 's' : ''}</span>
                </div>
                <div className="job-card-foot">
                  {j.deadline ? (
                    expired ? (
                      <span className="muted small">⏳ Candidatures fermées</span>
                    ) : (
                      <span className="small" style={{ color: '#b45309' }}>⏳ Postulez avant le {fmtDate(j.deadline)}</span>
                    )
                  ) : (
                    <span className="muted small">Postulez librement</span>
                  )}
                  <span className="btn-link">Voir l'offre →</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty icon="💼" title="Aucune offre pour le moment" text="Soyez le premier à publier une offre d'emploi sur la plateforme." />
      )}
    </div>
  );
}