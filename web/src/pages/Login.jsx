import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Alert, Spinner } from '../components/Ui.jsx';
import { errMsg } from '../api.js';

export default function Login() {
  const { token, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/tableau-de-bord';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <div className="page"><Spinner /></div>;
  if (token) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(phone, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page container narrow">
      <h1>Connexion</h1>
      <p className="muted">Numéro de téléphone & mot de passe.</p>
      {error ? <Alert tone="error">{error}</Alert> : null}

      <form onSubmit={submit} className="form">
        <label>
          Numéro de téléphone
          <input type="tel" placeholder="+229 91…"
            value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label>
          Mot de passe
          <input type="password" placeholder="••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary full" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="center muted" style={{ marginTop: 16 }}>
        Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
      </p>

      <div className="help-box">
        <strong>Comptes de démo</strong>
        <ul className="muted small">
          <li>Admin : <code>+22991000001</code> / <code>123456</code></li>
          <li>Client : <code>+22991000002</code> / <code>123456</code></li>
          <li>Plombier : <code>+22991000003</code> / <code>123456</code></li>
          <li>Freelance dev : <code>+22991000004</code> / <code>123456</code></li>
        </ul>
      </div>
    </div>
  );
}