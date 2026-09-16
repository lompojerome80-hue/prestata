import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errMsg, fmtDateTime } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Spinner, Avatar, Empty } from '../components/Ui.jsx';

export default function ConversationPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const load = async () => {
    try {
      const d = await api(`/api/conversations/${id}`, { token });
      setConv(d.conversation);
      setMessages(d.conversation.messages || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      await api(`/api/conversations/${id}/messages`, { method: 'POST', token, body: { body: text } });
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  if (!conv) return <div className="page"><Spinner /></div>;
  const other = conv.participants.find((p) => p.id !== user.id) || {};

  return (
    <div className="conv-page">
      <div className="conv-header">
        <Link to="/messagerie" className="btn btn-ghost">← Retour</Link>
        <Avatar url={other.avatarUrl} name={other.fullName} size={36} />
        <div>
          <strong>{other.fullName}</strong>
          {conv.request ? (
            <span className="muted small">
              {' '}• <Link to={`/demande/${conv.request.id}`}>{conv.request.title}</Link>
            </span>
          ) : null}
        </div>
      </div>

      <div className="conv-messages">
        {messages.length === 0 ? (
          <Empty icon="💬" title="Pas encore de messages" text="Envoyez le premier !" />
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`msg${m.senderId === user.id ? ' me' : ''}`}>
              <div className="msg-bubble">
                <p>{m.body}</p>
                <span className="msg-time">{fmtDateTime(m.createdAt)}</span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <div className="msg-error">{error}</div> : null}

      <form className="conv-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          type="text"
          placeholder="Écrire un message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!input.trim() || sending}>
          {sending ? '…' : '➤'}
        </button>
      </form>
    </div>
  );
}