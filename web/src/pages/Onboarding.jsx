import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errMsg, fileToDataUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Spinner } from '../components/Ui.jsx';

const UNITS = [
  ['HEURE', '/heure'],
  ['JOUR', '/jour'],
  ['FORFAIT', '/intervention'],
  ['MOT', '/mot'],
  ['PAGE', '/page'],
  ['SESSION', '/session'],
  ['SERVICE', '/service'],
];

export default function Onboarding() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

  const [form, setForm] = useState({
    headline: '',
    bio: '',
    avatarUrl: '',
    city: '',
    neighborhood: '',
    remoteOnly: false,
    rate: '',
    rateUnit: 'SERVICE',
    categoryIds: [],
    portfolioLinks: [{ url: '', caption: '' }],
  });

  useEffect(() => {
    Promise.all([api('/api/categories'), api('/api/providers/me', { token })])
      .then(([c, me]) => {
        setCategories(c.categories);
        if (me.provider) {
          setExisting(me.provider);
          setForm({
            headline: me.provider.headline,
            bio: me.provider.bio,
            avatarUrl: me.provider.avatarUrl || '',
            city: me.provider.city || '',
            neighborhood: me.provider.neighborhood || '',
            remoteOnly: me.provider.remoteOnly,
            rate: me.provider.rate != null ? String(me.provider.rate) : '',
            rateUnit: me.provider.rateUnit || 'SERVICE',
            categoryIds: (me.provider.categories || []).map((c) => c.id),
            portfolioLinks: (me.provider.portfolio || []).map((i) => ({ url: i.url, caption: i.caption || '' })),
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const d = await api('/api/uploads', { method: 'POST', token, body: { dataUrl } });
      set('avatarUrl', d.url);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleCat = (id) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((x) => x !== id)
        : [...f.categoryIds, id],
    }));
  };

  const setLink = (i, k, v) =>
    setForm((f) => {
      const links = [...f.portfolioLinks];
      links[i] = { ...links[i], [k]: v };
      return { ...f, portfolioLinks: links };
    });

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const payload = {
        headline: form.headline,
        bio: form.bio,
        avatarUrl: form.avatarUrl || null,
        city: form.city || null,
        neighborhood: form.neighborhood || null,
        remoteOnly: form.remoteOnly,
        rate: form.rate ? Number(form.rate) : null,
        rateUnit: form.rateUnit,
        categoryIds: form.categoryIds,
        portfolioLinks: form.portfolioLinks.filter((l) => l.url.trim()),
      };
      if (existing) {
        await api('/api/providers/me', { method: 'PUT', token, body: payload });
      } else {
        await api('/api/providers', { method: 'POST', token, body: payload });
      }
      setCreated(true);
      setTimeout(() => navigate('/tableau-de-bord'), 1200);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="page"><Spinner /></div>;

  const localCats = categories.filter((c) => c.kind !== 'DIGITAL');
  const remoteCats = categories.filter((c) => c.kind === 'DIGITAL');

  return (
    <div className="page container narrow">
      <h1>{existing ? 'Mon profil prestataire' : 'Devenir prestataire'}</h1>
      <p className="muted">
        {existing
          ? 'Modifiez vos informations. Le profil repassera en validation après modification.'
          : 'Créez votre profil en quelques minutes. Il sera vérifié par notre équipe avant publication.'}
      </p>

      {existing ? (
        <Alert tone={existing.status === 'APPROVED' ? 'success' : 'warning'}>
          Statut : <strong>{existing.status === 'APPROVED' ? 'Publié ✓' : existing.status === 'REJECTED' ? `Refusé (${existing.rejectionReason || '?'})` : 'En attente de validation…'}</strong>
        </Alert>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {created ? <Alert tone="success">✅ Profil enregistré ! Vous allez être redirigé…</Alert> : null}

      <div className="form">
        {existing && existing.status === 'PENDING' && !created ? (
          <Alert tone="info">
            Un profil en attente est déjà publié sur la plateforme ? Accédez à <Link to="/tableau-de-bord">votre tableau de bord</Link>.
          </Alert>
        ) : null}

        <h3 className="form-sub">Photo de profil</h3>
        <label className="check" style={{ gap: 10 }}>
          <input type="file" accept="image/*" onChange={onAvatarFile} />
        </label>
        {uploadingAvatar ? <div className="muted small">Envoi…</div> : null}
        {form.avatarUrl ? (
          <div className="attach-preview">
            <img src={form.avatarUrl} alt="Photo de profil" />
            <button type="button" className="btn btn-ghost small" onClick={() => set('avatarUrl', '')}>Retirer</button>
          </div>
        ) : null}

        <label>
          Titre / accroche
          <input type="text" placeholder="Ex : Plombier expérimenté à Cotonou"
            value={form.headline} onChange={(e) => set('headline', e.target.value)} required minLength={3} />
        </label>

        <label>
          Description
          <textarea rows={5} placeholder="Votre expérience, vos compétences, vos zones d'intervention…"
            value={form.bio} onChange={(e) => set('bio', e.target.value)} required minLength={10} />
        </label>

        <h3 className="form-sub">Zone & tarif</h3>
        <label className="check">
          <input type="checkbox" checked={form.remoteOnly} onChange={(e) => set('remoteOnly', e.target.checked)} />
          Je travaille <strong>à distance</strong> (prestations digitales uniquement)
        </label>

        {!form.remoteOnly ? (
          <div className="grid-2">
            <label>
              Ville
              <input type="text" placeholder="Ex : Cotonou" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </label>
            <label>
              Quartier
              <input type="text" placeholder="Ex : Gbegamey" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            </label>
          </div>
        ) : null}

        <div className="grid-2">
          <label>
            Tarif indicatif (FCFA)
            <input type="number" min={0} placeholder="Ex : 15000" value={form.rate} onChange={(e) => set('rate', e.target.value)} />
          </label>
          <label>
            Unité
            <select value={form.rateUnit} onChange={(e) => set('rateUnit', e.target.value)}>
              {UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>

        <h3 className="form-sub">Catégories de services</h3>
        {!form.remoteOnly ? (
          <>
            <div className="check-label">🏠 Artisanat</div>
            <div className="cat-check-grid">
              {localCats.map((c) => (
                <label key={c.id} className={form.categoryIds.includes(c.id) ? 'cat-check on' : 'cat-check'}>
                  <input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggleCat(c.id)} />
                  {c.name}
                </label>
              ))}
            </div>
          </>
        ) : null}
        <div className="check-label">💻 Digital</div>
        <div className="cat-check-grid">
          {remoteCats.map((c) => (
            <label key={c.id} className={form.categoryIds.includes(c.id) ? 'cat-check on' : 'cat-check'}>
              <input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggleCat(c.id)} />
              {c.name}
            </label>
          ))}
        </div>

        <h3 className="form-sub">Portfolio (liens)</h3>
        {form.portfolioLinks.map((l, i) => (
          <div key={i} className="grid-2">
            <input type="url" placeholder="URL (ex : portfolio, github…)" value={l.url} onChange={(e) => setLink(i, 'url', e.target.value)} />
            <input type="text" placeholder="Légende (optionnel)" value={l.caption} onChange={(e) => setLink(i, 'caption', e.target.value)} />
          </div>
        ))}
        <button type="button" className="btn btn-ghost small" onClick={() => set('portfolioLinks', [...form.portfolioLinks, { url: '', caption: '' }])}>
          + Ajouter un lien
        </button>

        <button type="button" className="btn btn-primary full" disabled={busy} onClick={submit}>
          {busy ? 'Enregistrement…' : existing ? 'Enregistrer les modifications' : 'Soumettre mon profil'}
        </button>
      </div>
    </div>
  );
}