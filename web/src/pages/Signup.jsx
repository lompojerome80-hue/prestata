import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Alert, Spinner } from '../components/Ui.jsx';
import { errMsg } from '../api.js';

export default function Signup() {
  const { token, signup, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (loading) return <div className="page"><Spinner /></div>;
  if (token) return <Navigate to="/tableau-de-bord" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const d = await signup({ fullName, phone, password });
      setResult(d);
      setTimeout(() => navigate('/tableau-de-bord', { replace: true }), 800);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page container narrow">
      <h1>Créer un compte</h1>
      <p className="muted">Vous pourrez devenir prestataire plus tard.</p>
      {error ? <Alert tone="error">{error}</Alert> : null}

      {!result ? (
        <form onSubmit={submit} className="form">
          <label>
            Nom complet
            <input type="text" placeholder="Ex : Aïcha Dossou"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label>
            Numéro de téléphone
            <input type="tel" placeholder="+229 91…"
              value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label>
            Mot de passe (8 caractères min., lettres et chiffres)
            <input type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </label>
          <button type="submit" className="btn btn-primary full" disabled={busy}>
            {busy ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      ) : (
        <Alert tone="success">
          Compte créé !
          {result.verification?.sandboxCode ? (
            <> Code de vérification (développement) : <strong>{result.verification.sandboxCode}</strong></>
          ) : (
            <> Un code de vérification vous a été envoyé par SMS.</>
          )}
        </Alert>
      )}

      <p className="center muted" style={{ marginTop: 16 }}>
        Déjà un compte ? <Link to="/connexion">Se connecter</Link>
      </p>
    </div>
  );
}