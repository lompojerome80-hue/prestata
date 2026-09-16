import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Spinner } from '../components/Ui.jsx';

const CONTRACT_TYPES = ['CDI', 'CDD', 'FREELANCE', 'STAGE'];

export default function JobForm() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const edit = !!id;

  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [contractType, setContractType] = useState('CDI');
  const [salary, setSalary] = useState('');
  const [city, setCity] = useState('');
  const [remote, setRemote] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(edit);

  useEffect(() => {
    api('/api/categories').then((d) => setCategories(d.categories || [])).catch(() => {});
    if (edit) {
      api(`/api/jobs/${id}`, { token })
        .then((d) => {
          const j = d.job;
          setTitle(j.title || '');
          setCompany(j.company || '');
          setContractType(j.contractType || 'CDI');
          setSalary(j.salary || '');
          setCity(j.city || '');
          setRemote(j.remote || false);
          setCategoryId(j.category?.id || '');
          setDeadline(j.deadline ? new Date(j.deadline).toISOString().slice(0, 10) : '');
          setDescription(j.description || '');
        })
        .catch((e) => setError(errMsg(e)))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (edit && loading) return <div className="page"><Spinner /></div>;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (description.trim().length < 20) {
      setError('La description doit faire au moins 20 caractères.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        title,
        company,
        description,
        contractType,
        salary: salary || null,
        city: city || null,
        remote,
        categoryId: categoryId || null,
        deadline: deadline || null,
      };
      const data = edit
        ? await api(`/api/jobs/${id}`, { method: 'PATCH', token, body })
        : await api('/api/jobs', { method: 'POST', token, body });
      navigate(`/emplois/${data.job.id}`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page container narrow">
      <h1>{edit ? "Modifier l'offre" : 'Publier une offre d\'emploi'}</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        {edit ? 'Mettez à jour les informations de votre offre.' : 'Décrivez le poste. Les candidats pourront postuler directement sur la plateforme.'}
      </p>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {user && !user.phoneVerified ? (
        <Alert tone="warning">⚠️ Confirmez d'abord votre numéro de téléphone dans <Link to="/mon-compte">Mon compte</Link> avant de publier.</Alert>
      ) : null}

      <form className="form" onSubmit={submit}>
        <label>
          Titre du poste *
          <input type="text" placeholder="Ex : Développeur Full Stack, Plombier expérimenté…" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={150} />
        </label>

        <label>
          Nom de l'entreprise / structure *
          <input type="text" placeholder="Ex : Agence Nova, PME Delta…" value={company} onChange={(e) => setCompany(e.target.value)} required minLength={2} maxLength={120} />
        </label>

        <div className="grid-2">
          <label>
            Type de contrat *
            <select value={contractType} onChange={(e) => setContractType(e.target.value)}>
              {CONTRACT_TYPES.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </label>

          <label>
            Rémunération
            <input type="text" placeholder="Ex : 150 000 FCFA / mois, Négociable…" value={salary} onChange={(e) => setSalary(e.target.value)} maxLength={100} />
          </label>
        </div>

        <div className="grid-2">
          <label>
            Ville
            <input type="text" placeholder="Ex : Cotonou" value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} />
          </label>

          <label>
            Catégorie
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="check">
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
          Poste en télétravail
        </label>

        <label>
          Date limite de candidature
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <span className="hint">Laissez vide si pas de limite.</span>
        </label>

        <label>
          Description du poste *
          <textarea
            rows={6}
            placeholder="Décrivez le poste, les missions, le profil recherché, les conditions…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={20}
            maxLength={5000}
          />
        </label>

        <div className="dash-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : edit ? 'Enregistrer les modifications' : 'Publier l\'offre'}
          </button>
          <Link to={edit ? `/emplois/${id}` : '/emplois'} className="btn btn-ghost">Annuler</Link>
        </div>
      </form>
    </div>
  );
}