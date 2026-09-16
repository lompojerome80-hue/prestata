import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, errMsg, money, fileToDataUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Avatar, Spinner, Empty } from '../components/Ui.jsx';

export default function RequestForm() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [kind, setKind] = useState('ARTISAN');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('');
  const [budget, setBudget] = useState('');
  const [city, setCity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api(`/api/providers/${id}`, { token })
      .then((d) => {
        setProvider(d.provider);
        setKind(d.provider.remoteOnly ? 'FREELANCE' : 'ARTISAN');
        const firstCat = d.provider.categories?.[0];
        if (firstCat) setCategoryId(firstCat.id);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const d = await api('/api/uploads', { method: 'POST', token, body: { dataUrl } });
      setPhotoUrl(d.url);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setUploading(false);
    }
  };

  if (error && !provider) return <div className="page container"><Empty icon="⚠️" title="Erreur" text={error} /></div>;
  if (!provider) return <div className="page"><Spinner /></div>;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const d = await api('/api/requests', {
        method: 'POST',
        token,
        body: {
          providerId: provider.id,
          title,
          description,
          kind,
          urgency: urgency || null,
          budget: budget ? Number(budget) : null,
          city: city || null,
          categoryId: categoryId || null,
          photoUrl: photoUrl || null,
        },
      });
      navigate(`/demande/${d.request.id}`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page container narrow">
      <h1>Demander un devis</h1>

      <div className="mini-provider">
        <Avatar url={provider.avatarUrl} name={provider.fullName} size={44} />
        <div>
          <strong>{provider.fullName}</strong>
          <div className="muted small">{provider.headline}</div>
        </div>
        {provider.rate != null ? <div className="mini-rate">{money(provider.rate)}</div> : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <form onSubmit={submit} className="form">
        <div className="seg">
          <label><input type="radio" name="kind" checked={kind === 'ARTISAN'} onChange={() => setKind('ARTISAN')} /> Artisan (chez moi)</label>
          <label><input type="radio" name="kind" checked={kind === 'FREELANCE'} onChange={() => setKind('FREELANCE')} /> Freelance (à distance)</label>
        </div>

        <label>
          Titre du besoin
          <input type="text" placeholder="Ex : Fuite d'eau sous l'évier"
            value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        </label>

        <label>
          Description
          <textarea
            placeholder={kind === 'ARTISAN'
              ? 'Décrivez le problème : où, depuis quand, ce que vous avez constaté…'
              : 'Décrivez votre projet / cahier des charges court : objectif, livrables, délais…'}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
          />
        </label>

        {kind === 'ARTISAN' ? (
          <>
            <label>
              Urgence
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option value="">Pas d'urgence particulière</option>
                <option value="TODAY">Aujourd'hui</option>
                <option value="THIS_WEEK">Cette semaine</option>
              </select>
            </label>
            <label>
              Ville / quartier
              <input type="text" placeholder="Ex : Cotonou, Gbegamey"
                value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
          </>
        ) : (
          <label>
            Budget indicatif (FCFA)
            <input type="number" min={0} placeholder="Ex : 50000"
              value={budget} onChange={(e) => setBudget(e.target.value)} />
          </label>
        )}

        <label>
          Photo (optionnelle — ex : la fuite d'eau)
          <input type="file" accept="image/*" ref={fileRef} onChange={onFile} />
          {uploading ? <div className="muted small">Envoi…</div> : null}
          {photoUrl ? (
            <div className="attach-preview">
              <img src={photoUrl} alt="Pièce jointe" />
              <button type="button" className="btn btn-ghost small" onClick={() => { setPhotoUrl(''); fileRef.current.value = ''; }}>Retirer</button>
            </div>
          ) : null}
        </label>

        <button type="submit" className="btn btn-primary full" disabled={busy || uploading}>
          {busy ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>
    </div>
  );
}