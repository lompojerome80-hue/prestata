import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, fmtDateTime } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Empty, Spinner, Avatar } from '../components/Ui.jsx';

export default function Messenger() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toUserId = params.get('to');
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Si on a un ?to=, créer ou récupérer la conversation, puis rediriger
      if (toUserId) {
        try {
          const d = await api('/api/conversations', { method: 'POST', token, body: { userId: toUserId } });
          navigate(`/messagerie/${d.conversation.id}`, { replace: true });
          return;
        } catch { /* ignore, fallback to list */ }
      }
      try {
        const d = await api('/api/conversations', { token });
        setConvs(d.conversations || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [toUserId]);

  if (loading && !toUserId) return <div className="page"><Spinner /></div>;
  if (!convs.length && !toUserId) {
    return (
      <div className="page container">
        <h1>Messagerie</h1>
        <Empty icon="💬" title="Aucune conversation" text='Créez une conversation en contactant un prestataire depuis sa fiche.' />
      </div>
    );
  }

  return (
    <div className="page container">
      <h1>Messagerie</h1>
      <div className="conv-list">
        {convs.map((c) => {
          const other = c.participants.find((p) => p.id !== user.id) || {};
          const isActive = c.lastMessage;
          return (
            <Link key={c.id} to={`/messagerie/${c.id}`} className={`conv-item${isActive ? '' : ' new'}`}>
              <Avatar url={other.avatarUrl} name={other.fullName} size={44} />
              <div className="conv-info">
                <div className="conv-top">
                  <strong>{other.fullName || 'Utilisateur'}</strong>
                  <span className="muted small">{c.lastMessage ? fmtDateTime(c.lastMessage.createdAt) : ''}</span>
                </div>
                <p className="muted small clamp-1">
                  {c.request ? <>[Dem.] {c.request.title} • </> : null}
                  {c.lastMessage ? c.lastMessage.body : 'Pas encore de message'}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}