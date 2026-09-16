export function Stars({ rating, count }) {
  const value = Number(rating || 0);
  return (
    <span className="stars">
      <span className="stars-icons">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= Math.round(value) ? 'star on' : 'star'}>★</span>
        ))}
      </span>
      <span className="stars-text">
        {value > 0 ? value.toFixed(1) : '—'}
        {count != null ? ` (${count})` : ''}
      </span>
    </span>
  );
}

export function VerifiedBadge({ verified }) {
  if (!verified) return null;
  return (
    <span className="verified" title="Profil vérifié (téléphone confirmé)">
      ✓ Vérifié
    </span>
  );
}

export function StatusPill({ status, map }) {
  const s = map?.[status];
  if (!s) return <span className="pill">{status}</span>;
  return <span className="pill" style={{ background: s.color + '1a', color: s.color }}>{s.label}</span>;
}

export function Avatar({ url, name, size = 46 }) {
  if (url) return <img className="avatar" src={url} alt={name} style={{ width: size, height: size }} />;
  return (
    <span className="avatar avatar-initial" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Spinner({ label = 'Chargement…' }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}

export function Empty({ icon = '🗂️', title, text }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text ? <p className="muted">{text}</p> : null}
    </div>
  );
}

export function Alert({ tone = 'info', children }) {
  return <div className={`alert alert-${tone}`}>{children}</div>;
}

export function PageTitle({ title, sub }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      {sub ? <p className="muted">{sub}</p> : null}
    </div>
  );
}