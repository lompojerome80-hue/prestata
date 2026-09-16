import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg, fmtDate, fileToDataUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Spinner, VerifiedBadge } from '../components/Ui.jsx';

export default function AccountPage() {
  const { token, user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Vérif téléphone
  const [verifCode, setVerifCode] = useState('');
  const [sandboxCode, setSandboxCode] = useState(null);
  const [verifBusy, setVerifBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const saveProfile = async () => {
    setBusy(true);
    try {
      await api('/api/auth/me', { method: 'PUT', token, body: { fullName, avatarUrl: avatarUrl || null } });
      await refreshUser();
      setSuccess('✅ Profil mis à jour !');
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const d = await api('/api/uploads', { method: 'POST', token, body: { dataUrl } });
      setAvatarUrl(d.url);
    } catch (err) { setError(errMsg(err)); }
    finally { setUploading(false); }
  };

  const requestVerify = async () => {
    setVerifBusy(true);
    try {
      const d = await api('/api/auth/request-verify', { method: 'POST', token });
      if (d.sandboxCode) setSandboxCode(d.sandboxCode);
    } catch (e) { setError(errMsg(e)); }
    finally { setVerifBusy(false); }
  };

  const confirmVerify = async () => {
    setVerifBusy(true);
    try {
      await api('/api/auth/verify', { method: 'POST', token, body: { code: verifCode } });
      await refreshUser();
      setSuccess('✅ Téléphone vérifié !');
      setVerifCode('');
      setSandboxCode(null);
    } catch (e) { setError(errMsg(e)); }
    finally { setVerifBusy(false); }
  };

  return (
    <div className="page container narrow">
      <h1>Mon compte</h1>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <section className="section-box">
        <h2>Profil</h2>
        <div className="form">
          <label>
            Photo de profil
            <div className="attach-preview">
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : <span className="avatar avatar-initial" style={{ width: 80, height: 80, fontSize: 32 }}>{(user?.fullName || '?').slice(0, 1)}</span>}
              <input type="file" accept="image/*" onChange={onAvatarFile} disabled={uploading} />
            </div>
            {uploading ? <div className="muted small">Envoi…</div> : null}
          </label>
          <label>
            Nom complet
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary" disabled={busy || uploading} onClick={saveProfile}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <div className="detail-row"><span className="muted">Téléphone</span> {user?.phone} <VerifiedBadge verified={user?.phoneVerified} /></div>
          {user?.isAdmin ? <div className="detail-row"><span className="muted">Rôle</span> Administrateur</div> : null}
        </div>
      </section>

      <section className="section-box">
        <h2>Vérifier mon téléphone</h2>
        {user?.phoneVerified ? (
          <p className="muted">✅ Votre numéro est confirmé.</p>
        ) : (
          <>
            <p className="muted">Un code de vérification vous sera envoyé par SMS. Saisissez-le ci-dessous pour confirmer votre numéro.</p>
            <button type="button" className="btn btn-outline" disabled={verifBusy} onClick={requestVerify}>
              {verifBusy ? 'Envoi…' : 'Recevoir le code par SMS'}
            </button>
            {sandboxCode ? (
              <Alert tone="info">
                Code (développement uniquement) : <strong>{sandboxCode}</strong>
              </Alert>
            ) : null}
            <div className="form" style={{ marginTop: 8 }}>
              <label>
                Code
                <input type="text" placeholder="000000" value={verifCode} onChange={(e) => setVerifCode(e.target.value)} />
              </label>
              <button type="button" className="btn btn-primary" disabled={verifBusy || verifCode.length < 4} onClick={confirmVerify}>
                Confirmer
              </button>
            </div>
          </>
        )}
      </section>

      <section className="section-box">
        <h2>Liens rapides</h2>
        <div className="quick-links">
          <Link to="/tableau-de-bord" className="btn btn-ghost">Tableau de bord</Link>
          <Link to="/devenir-prestataire" className="btn btn-ghost">Profil prestataire</Link>
          <Link to="/recherche" className="btn btn-ghost">Rechercher</Link>
        </div>
      </section>
    </div>
  );
}