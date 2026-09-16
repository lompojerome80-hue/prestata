import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errMsg, money, fmtDate, REQUEST_STATUS, URGENCY_LABELS } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Avatar, Empty, Spinner, StatusPill } from '../components/Ui.jsx';

export default function RequestDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDesc, setQuoteDesc] = useState('');
  const [quoteDelay, setQuoteDelay] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);

  const load = () =>
    api(`/api/requests/${id}`, { token })
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => { load(); }, [id]);

  const submitQuote = async () => {
    setSendingQuote(true);
    try {
      await api(`/api/requests/${id}/quotes`, {
        method: 'POST',
        token,
        body: {
          amount: Number(quoteAmount),
          description: quoteDesc || null,
          delayDays: quoteDelay ? Number(quoteDelay) : null,
        },
      });
      await load();
      setQuoteAmount('');
      setQuoteDesc('');
      setQuoteDelay('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSendingQuote(false);
    }
  };

  const acceptQuote = async (quoteId) => {
    if (!window.confirm('Accepter ce devis ? Une prestation sera créée et le travail pourra commencer.')) return;
    try {
      await api(`/api/quotes/${quoteId}/accept`, { method: 'POST', token });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const rejectQuote = async (quoteId) => {
    try {
      await api(`/api/quotes/${quoteId}/reject`, { method: 'POST', token });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const cancelRequest = async () => {
    if (!window.confirm('Annuler cette demande ?')) return;
    try {
      await api(`/api/requests/${id}/cancel`, { method: 'POST', token });
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (error && !data) return <div className="page container"><Empty icon="⚠️" title="Erreur" text={error} /></div>;
  if (!data) return <div className="page"><Spinner /></div>;
  const r = data.request;
  const isClient = r.clientId === user.id;
  const isProvider = user.isAdmin || !isClient;

  return (
    <div className="page container narrow">
      <div className="section-head">
        <h1>{r.title}</h1>
        <StatusPill status={r.status} map={REQUEST_STATUS} />
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="detail-grid">
        <div className="detail-info">
          <div className="detail-row"><span className="muted">Réf.</span> {r.reference}</div>
          <div className="detail-row"><span className="muted">Créée le</span> {fmtDate(r.createdAt)}</div>
          {r.category ? <div className="detail-row"><span className="muted">Catégorie</span> {r.category.name}</div> : null}
          <div className="detail-row"><span className="muted">Type</span> {r.kind === 'FREELANCE' ? '🌐 Freelance' : '🏠 Artisan'}</div>
          {r.urgency ? <div className="detail-row"><span className="muted">Urgence</span> {URGENCY_LABELS[r.urgency]}</div> : null}
          {r.city ? <div className="detail-row"><span className="muted">Lieu</span> {r.city}</div> : null}
          {r.budget ? <div className="detail-row"><span className="muted">Budget</span> {money(r.budget)}</div> : null}
          {r.photoUrl ? (
            <div className="detail-row">
              <span className="muted">Photo</span>
              <a href={r.photoUrl} target="_blank" rel="noreferrer">
                <img src={r.photoUrl} alt="Pièce jointe" className="detail-photo" />
              </a>
            </div>
          ) : null}
        </div>

        <section className="section-box">
          <h2>Description</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{r.description}</p>
        </section>

        {r.conversationId ? (
          <Link to={`/messagerie/${r.conversationId}`} className="btn btn-outline">💬 Ouvrir la conversation</Link>
        ) : null}

        {isClient && ['NEW', 'QUOTE_SENT'].includes(r.status) ? (
          <button type="button" className="btn btn-ghost danger" onClick={cancelRequest}>Annuler la demande</button>
        ) : null}
      </div>

      {/* Devis reçus */}
      <section className="section-box">
        <h2>Devis ({r.quotes?.length || 0})</h2>
        {r.quotes?.length ? (
          <div className="quotes">
            {r.quotes.map((q) => (
              <div key={q.id} className={`quote ${q.status}`}>
                <div className="quote-head">
                  <strong>{money(q.amount)}</strong>
                  <StatusPill status={q.status} map={{ SENT: { label: 'En attente', color: '#f59e0b' }, ACCEPTED: { label: 'Accepté', color: '#10b981' }, REJECTED: { label: 'Refusé', color: '#ef4444' } }} />
                  {q.delayDays ? <span className="muted small">⏱ {q.delayDays} jour{q.delayDays > 1 ? 's' : ''}</span> : null}
                  <span className="muted small">{fmtDate(q.createdAt)}</span>
                </div>
                {q.description ? <p className="muted">{q.description}</p> : null}
                {isClient && q.status === 'SENT' && r.status === 'QUOTE_SENT' ? (
                  <div className="quote-actions">
                    <button type="button" className="btn btn-primary small" onClick={() => acceptQuote(q.id)}>✅ Accepter</button>
                    <button type="button" className="btn btn-ghost small" onClick={() => rejectQuote(q.id)}>Refuser</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Aucun devis reçu pour le moment.</p>
        )}
      </section>

      {/* Prestation créée ? */}
      {r.prestation ? (
        <section className="section-box">
          <h2>Prestation</h2>
          <Link to={`/prestation/${r.prestation.id}`} className="card row-card">
            <strong>{r.title}</strong>
            <span>{money(r.prestation.amount)}</span>
          </Link>
        </section>
      ) : null}

      {/* Le prestataire peut envoyer un devis si c'est sa demande et status=NEW/QUOTE_SENT */}
      {isProvider && r.providerStatus === 'APPROVED' && ['NEW', 'QUOTE_SENT'].includes(r.status) ? (
        <section className="section-box">
          <h2>Envoyer un devis</h2>
          <div className="form">
            <label>
              Montant (FCFA)
              <input type="number" min={1} placeholder="Ex : 15000"
                value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
            </label>
            <label>
              Délai estimé (jours)
              <input type="number" min={1} placeholder="Ex : 2"
                value={quoteDelay} onChange={(e) => setQuoteDelay(e.target.value)} />
            </label>
            <label>
              Détails du devis
              <textarea rows={3} placeholder="Décrivez les travaux inclus dans ce devis…"
                value={quoteDesc} onChange={(e) => setQuoteDesc(e.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" disabled={sendingQuote} onClick={submitQuote}>
              {sendingQuote ? 'Envoi…' : 'Envoyer le devis'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}