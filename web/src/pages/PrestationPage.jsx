import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errMsg, money, PRESTATION_STATUS } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Empty, Spinner, StatusPill, Avatar } from '../components/Ui.jsx';

const DEFAULT_PROVIDERS = ['ORANGE_MONEY', 'MOOV_MONEY'];

export default function PrestationPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [payStatus, setPayStatus] = useState(null);

  // Paiement
  const [payProvider, setPayProvider] = useState('ORANGE_MONEY');
  const [phone, setPhone] = useState('');
  const [initiated, setInitiated] = useState(null);
  const [otp, setOtp] = useState('');
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Avis
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const load = () =>
    api(`/api/prestations/${id}`, { token })
      .then((d) => setP(d.prestation))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api('/api/payments/status', { token })
      .then((s) => setPayStatus(s))
      .catch(() => setPayStatus({ available: true, sandbox: false, providers: DEFAULT_PROVIDERS }));
  }, [id]);

  const markComplete = async () => {
    if (!window.confirm('Confirmer que le travail est terminé ?')) return;
    try {
      await api(`/api/prestations/${id}/complete`, { method: 'POST', token });
      await load();
    } catch (e) { setError(errMsg(e)); }
  };

  const initiate = async () => {
    if (!phone || phone.length < 8) { setError('Saisissez votre numéro de téléphone'); return; }
    setError('');
    setPaying(true);
    try {
      const d = await api(`/api/prestations/${id}/pay`, {
        method: 'POST',
        token,
        body: { provider: payProvider, phone },
      });
      setInitiated(d);
    } catch (e) { setError(errMsg(e)); }
    finally { setPaying(false); }
  };

  const confirm = async (paymentId) => {
    setConfirming(true);
    try {
      await api(`/api/payments/${paymentId || initiated.payment.id}/confirm`, {
        method: 'POST',
        token,
        body: otp ? { otp } : {},
      });
      await load();
      setInitiated(null);
      setOtp('');
    } catch (e) { setError(errMsg(e)); }
    finally { setConfirming(false); }
  };

  const submitReview = async () => {
    if (!rating) { setError('Choisissez une note de 1 à 5'); return; }
    setReviewing(true);
    try {
      await api(`/api/prestations/${id}/review`, {
        method: 'POST',
        token,
        body: { rating, comment: comment || null },
      });
      await load();
    } catch (e) { setError(errMsg(e)); }
    finally { setReviewing(false); }
  };

  if (!p) return <div className="page"><Spinner /></div>;
  if (error && !p) return <div className="page container"><Empty icon="⚠️" title="Erreur" text={error} /></div>;

  const isClient = p.clientId === user.id;
  const providers = payStatus?.providers?.length ? payStatus.providers : DEFAULT_PROVIDERS;
  const paymentsAvailable = payStatus ? payStatus.available : true;
  const isSandbox = payStatus?.sandbox === true;

  return (
    <div className="page container narrow">
      <div className="section-head">
        <h1>{p.requestTitle}</h1>
        <StatusPill status={p.status} map={PRESTATION_STATUS} />
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="section-box">
        <div className="prestation-status">
          <Avatar url={null} name={isClient ? p.providerName : p.clientName} size={44} />
          <div>
            <div className="muted small">{isClient ? 'Prestataire' : 'Client'}</div>
            <strong>{isClient ? p.providerName : p.clientName}</strong>
          </div>
          <div className="prestation-amount">
            <div className="muted small">Montant</div>
            <strong>{money(p.amount)}</strong>
          </div>
        </div>
        {p.request ? <p className="muted small" style={{ marginTop: 10 }}>{p.request.description}</p> : null}
      </div>

      {/* ====== Prestataire : marquer terminé ====== */}
      {!isClient && ['IN_PROGRESS'].includes(p.status) ? (
        <section className="section-box">
          <h2>Travail en cours</h2>
          <p className="muted">Dites au client que le travail est fini pour enclencher le paiement.</p>
          <button type="button" className="btn btn-primary" onClick={markComplete}>✅ Marquer comme terminé</button>
        </section>
      ) : null}

      {/* ====== Client : payer ====== */}
      {isClient && p.status === 'COMPLETED' && !p.payment ? (
        <section className="section-box">
          <h2>💳 Payer votre prestataire</h2>
          <p className="muted">Montant : <strong>{money(p.amount)}</strong></p>

          {!paymentsAvailable ? (
            <Alert tone="info">
              Le paiement en ligne arrive bientôt. En attendant, mettez-vous d'accord directement
              avec <strong>{p.providerName}</strong> pour le règlement (Orange Money / Moov Money).
            </Alert>
          ) : (
            <div className="form">
              <label>
                Moyen de paiement
                <select value={payProvider} onChange={(e) => setPayProvider(e.target.value)}>
                  {providers.map((pr) => (
                    <option key={pr} value={pr}>{pr === 'ORANGE_MONEY' ? 'Orange Money' : 'Moov Money'}</option>
                  ))}
                </select>
              </label>
              <label>
                Votre numéro (pour payer)
                <input type="tel" placeholder="+229 91…" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              {!initiated ? (
                <button type="button" className="btn btn-primary" disabled={paying} onClick={initiate}>
                  {paying ? 'Initiation…' : 'Payer maintenant'}
                </button>
              ) : null}

              {initiated ? (
                <div>
                  <Alert tone="info">
                    <strong>Paiement initié.</strong>
                    <div className="muted small">
                      Vous allez recevoir une demande de validation sur votre téléphone ({phone}).{'\n'}
                      {isSandbox ? 'En mode développement, le code est affiché ci-dessous.' : 'Validez dans votre application mobile puis confirmez ci-dessous.'}
                    </div>
                  </Alert>

                  {isSandbox ? (
                    <div className="form">
                      <label>
                        Code de confirmation (développement)
                        <input type="text" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)} />
                        {initiated.sandboxOtp ? (
                          <span className="hint">👉 Cliquez pour remplir : <button type="button" className="link-btn" onClick={() => setOtp(initiated.sandboxOtp)}>{initiated.sandboxOtp}</button></span>
                        ) : null}
                      </label>
                    </div>
                  ) : null}

                  <button type="button" className="btn btn-primary" disabled={confirming} onClick={() => confirm()}>
                    {confirming ? 'Vérification…' : isSandbox ? 'Confirmer le paiement' : 'J’ai validé — vérifier le statut'}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {/* ====== Client : reprendre une confirmation interrompue ====== */}
      {isClient && p.payment && p.payment.status === 'INITIATED' ? (
        <section className="section-box">
          <h2>Paiement en attente de confirmation</h2>
          <p className="muted">Un paiement a été initié mais pas encore confirmé.</p>
          <div className="form">
            <label>
              Référence
              <input type="text" value={p.payment.providerRef} disabled />
            </label>
            <button type="button" className="btn btn-primary" disabled={confirming} onClick={() => confirm(p.payment.id)}>
              {confirming ? 'Vérification…' : 'Vérifier le statut'}
            </button>
          </div>
        </section>
      ) : null}

      {/* ====== Client : noter ====== */}
      {isClient && p.status === 'PAID' && !p.review ? (
        <section className="section-box">
          <h2>⭐ Notez votre prestataire</h2>
          <p className="muted">Votre retour est essentiel. La note est obligatoire pour soumettre une nouvelle demande.</p>
          <div className="form">
            <div className="rate-picker">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" className={rating >= i ? 'star-btn on' : 'star-btn'} onClick={() => setRating(i)}>★</button>
              ))}
            </div>
            <label>
              Commentaire (optionnel)
              <textarea rows={3} placeholder="Partagez votre expérience…" value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" disabled={reviewing || !rating} onClick={submitReview}>
              {reviewing ? 'Envoi…' : 'Publier mon avis'}
            </button>
          </div>
        </section>
      ) : null}

      {/* ====== Récap paiement ====== */}
      {p.payment ? (
        <section className="section-box">
          <h2>Paiement</h2>
          <div className="detail-row"><span className="muted">Moyen</span> {p.payment.provider === 'ORANGE_MONEY' ? 'Orange Money' : 'Moov Money'}</div>
          <div className="detail-row"><span className="muted">Référence</span> {p.payment.providerRef}</div>
          <div className="detail-row"><span className="muted">Montant</span> {money(p.payment.amount)}</div>
          <div className="detail-row"><span className="muted">Statut</span> {p.payment.status === 'SUCCESSFUL' ? '✅ Payé' : p.payment.status}</div>
        </section>
      ) : null}

      {/* ====== Avis donné ====== */}
      {p.review ? (
        <section className="section-box">
          <h2>Merci pour votre avis ! 🌟</h2>
          <p className="muted">Cette prestation est notée. Vous pouvez en tout temps consulter la fiche du prestataire.</p>
          <Link to="/recherche" className="btn btn-outline">Trouver un autre prestataire</Link>
        </section>
      ) : null}

      <div className="dash-actions">
        <Link to="/tableau-de-bord" className="btn btn-ghost">← Retour au tableau de bord</Link>
      </div>
    </div>
  );
}