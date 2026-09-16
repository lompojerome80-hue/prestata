import { Link } from 'react-router-dom';
import { fmtDate, fmtDateTime, REQUEST_STATUS, URGENCY_LABELS } from '../api.js';
import { StatusPill, Avatar } from './Ui.jsx';

export default function RequestCard({ request }) {
  const st = REQUEST_STATUS[request.status] || {};
  const isQuote = request.quotes?.length > 0;
  const needReview = request.prestation && ['COMPLETED', 'PAID'].includes(request.prestation.status);

  return (
    <Link to={`/demande/${request.id}`} className="card request-card">
      <div className="request-card-head">
        <div className="request-card-title">
          <strong>{request.title}</strong>
          <StatusPill status={request.status} map={REQUEST_STATUS} />
        </div>
        <span className="muted small">{fmtDate(request.createdAt)}</span>
      </div>

      <p className="muted small clamp-2">{request.description}</p>

      <div className="request-card-meta">
        <span className="chip">{request.category?.name || 'Sans catégorie'}</span>
        {request.urgency ? (
          <span className="chip chip-warn">{URGENCY_LABELS[request.urgency]}</span>
        ) : null}
        {request.kind === 'FREELANCE' && request.budget ? (
          <span className="chip chip-info">{Number(request.budget).toLocaleString('fr-FR')} FCFA</span>
        ) : null}
      </div>

      <div className="request-card-foot">
        <span className="muted small">
          {request.clientName ? (
            <>
              <Avatar url={null} name={request.clientName} size={20} /> {request.clientName}
            </>
          ) : request.providerName ? (
            <>
              <Avatar url={null} name={request.providerName} size={20} /> {request.providerName}
            </>
          ) : null}
          {request.lastMessage ? <> • 💬 {request.lastMessage.body.slice(0, 40)}…</> : null}
        </span>
        <span className="muted small">
          {needReview ? '⭐ À noter' : isQuote ? `${request.quotes.length} devis` : 'Devis en attente'}
        </span>
      </div>
    </Link>
  );
}