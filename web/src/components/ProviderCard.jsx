import { Link } from 'react-router-dom';
import { RATE_UNIT_LABELS, money } from '../api.js';
import { Stars, VerifiedBadge, Avatar } from './Ui.jsx';

export default function ProviderCard({ provider }) {
  const cats = provider.categories || [];
  return (
    <Link to={`/prestataire/${provider.id}`} className="provider-card">
      <div className="provider-card-head">
        <Avatar url={provider.avatarUrl} name={provider.fullName} size={54} />
        <div className="provider-card-name">
          <div className="provider-title">
            {provider.fullName} <VerifiedBadge verified={provider.verifiedBadge} />
          </div>
          <div className="muted small">{provider.headline}</div>
        </div>
      </div>

      <p className="provider-bio">{provider.bio.slice(0, 140)}{provider.bio.length > 140 ? '…' : ''}</p>

      <div className="chips">
        {cats.slice(0, 3).map((c) => (
          <span key={c.id} className="chip">{c.name}</span>
        ))}
      </div>

      <div className="provider-card-foot">
        <Stars rating={provider.ratingAvg} count={provider.ratingCount} />
        <div className="provider-rate">
          {provider.rate != null ? (
            <>
              <strong>{money(provider.rate)}</strong>
              <span className="muted small">{RATE_UNIT_LABELS[provider.rateUnit] || ''}</span>
            </>
          ) : (
            <span className="muted small">Tarif sur demande</span>
          )}
        </div>
        <div className="provider-loc small muted">
          {provider.remoteOnly ? '🌐 À distance' : provider.city ? `📍 ${provider.city}` : ''}
        </div>
      </div>
    </Link>
  );
}