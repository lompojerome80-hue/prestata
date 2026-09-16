import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate, PRESTATION_STATUS } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Empty, Spinner, StatusPill, Avatar } from '../components/Ui.jsx';
import RequestCard from '../components/RequestCard.jsx';

export default function Dashboard() {
  const { user, token, roleMode, setRoleMode } = useAuth();
  const [provider, setProvider] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [myPrestations, setMyPrestations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewPrompt, setReviewPrompt] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api('/api/providers/me', { token }).catch(() => ({ provider: null })),
      api('/api/requests/incoming', { token }),
      api('/api/requests/outgoing', { token }),
      api('/api/prestations?role=provider', { token }),
      api('/api/notifications', { token }),
    ])
      .then(([me, inc, out, pre, notif]) => {
        setProvider(me.provider);
        setIncoming(inc.requests || []);
        setOutgoing(out.requests || []);
        setMyPrestations(pre.prestations || []);
        setNotifications(notif.notifications || []);
        setUnread(notif.unread || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Alerte "avis obligatoire" sur les prestations à noter
  useEffect(() => {
    (async () => {
      const d = await api('/api/prestations?role=client', { token }).catch(() => ({ prestations: [] }));
      const pending = (d.prestations || []).find((p) => ['COMPLETED', 'PAID'].includes(p.status) && !p.reviewedAt);
      setReviewPrompt(pending || null);
    })();
  }, [loading]);

  if (loading) return <div className="page"><Spinner /></div>;

  const isProviderView = roleMode === 'PRESTATAIRE';

  return (
    <div className="page container">
      <div className="dash-head">
        <div>
          <h1>Bonjour, {user.fullName.split(' ')[0]} 👋</h1>
          <p className="muted">Vue {isProviderView ? 'prestataire' : 'client'}</p>
        </div>
        <div className="seg">
          <span className="seg-label">Voir en tant que</span>
          <button type="button" className={!isProviderView ? 'on' : ''} onClick={() => setRoleMode('CLIENT')}>Client</button>
          <button type="button" className={isProviderView ? 'on' : ''} onClick={() => setRoleMode('PRESTATAIRE')}>Prestataire</button>
        </div>
      </div>

      {/* Notifications récentes */}
      {notifications.length ? (
        <section className="section-box">
          <div className="section-head">
            <h2>Notifications {unread ? <span className="badge">{unread}</span> : null}</h2>
          </div>
          <div className="notif-list">
            {notifications.slice(0, 4).map((n) => (
              <div key={n.id} className={`notif${n.read ? '' : ' unread'}`}>
                <strong>{n.title}</strong>
                <span className="muted small">{n.message}</span>
                <span className="muted small">{fmtDate(n.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isProviderView ? (
        <>
          {!provider ? (
            <section className="section-box cta-small">
              <h2>Hey, devenez prestataire !</h2>
              <p className="muted">Créez votre profil pour recevoir des demandes de devis.</p>
              <Link to="/devenir-prestataire" className="btn btn-primary">Créer mon profil prestataire</Link>
            </section>
          ) : (
            <>
              <section className="section-box">
                <div className="section-head">
                  <h2>Mon profil prestataire</h2>
                  <Link to="/devenir-prestataire" className="btn btn-ghost">Modifier</Link>
                </div>
                <div className="provider-status-line">
                  <Avatar url={provider.avatarUrl} name={provider.fullName} size={48} />
                  <div>
                    <strong>{provider.headline}</strong>
                    <div className="muted small">
                      {provider.status === 'APPROVED'
                        ? '✅ Publié — visible dans la recherche'
                        : provider.status === 'REJECTED'
                          ? `❌ Refusé : ${provider.rejectionReason || 'motif non précisé'}`
                          : '⏳ En attente de validation par l’équipe'}
                    </div>
                  </div>
                  {provider.status === 'APPROVED' ? (
                    <Link to={`/prestataire/${provider.id}`} className="btn btn-outline small">Voir ma fiche</Link>
                  ) : null}
                </div>
              </section>

              <h2 className="section-title">Demandes reçues ({incoming.length})</h2>
              {incoming.length ? (
                <div className="card-stack">
                  {incoming.map((r) => <RequestCard key={r.id} request={r} />)}
                </div>
              ) : (
                <Empty icon="📭" title="Aucune demande reçue" text="Quand un client vous sollicitera, la demande apparaîtra ici." />
              )}

              <h2 className="section-title">Mes prestations ({myPrestations.length})</h2>
              {myPrestations.length ? (
                <div className="card-stack">
                  {myPrestations.map((p) => (
                    <Link key={p.id} to={`/prestation/${p.id}`} className="card row-card">
                      <div>
                        <strong>{p.requestTitle}</strong>
                        <div className="muted small">
                          {p.clientName} • {Number(p.amount).toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                      <StatusPill status={p.status} map={PRESTATION_STATUS} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted">Aucune prestation pour le moment.</p>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {reviewPrompt ? (
            <Alert tone="warning">
              ⭐ Vous devez noter « <Link to={`/prestation/${reviewPrompt.id}`}><strong>{reviewPrompt.requestTitle}</strong></Link> »
              avant de soumettre une nouvelle demande.
            </Alert>
          ) : null}

          <h2 className="section-title">Mes demandes ({outgoing.length})</h2>
          {outgoing.length ? (
            <div className="card-stack">
              {outgoing.map((r) => <RequestCard key={r.id} request={r} />)}
            </div>
          ) : (
            <Empty icon="📋" title="Aucune demande" text='Parcourez la recherche et cliquez sur "Demander un devis".' />
          )}

          <div className="dash-actions">
            <Link to="/recherche" className="btn btn-primary">Trouver un prestataire</Link>
            <Link to="/mon-compte" className="btn btn-ghost">Mon compte</Link>
          </div>
        </>
      )}
    </div>
  );
}