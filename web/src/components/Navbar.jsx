import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth.jsx';

export default function Navbar() {
  const { user, logout, token, roleMode, setRoleMode } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const switchRole = () => {
    setRoleMode(roleMode === 'CLIENT' ? 'PRESTATAIRE' : 'CLIENT');
    navigate('/tableau-de-bord');
  };

  const cls = ({ isActive }) =>
    `nav-link${isActive ? ' active' : ''}`;

  return (
    <header className="navbar">
      <div className="nav-inner container">
        <Link to="/" className="brand">
          <span className="brand-mark">P</span>
          Prestata
        </Link>

        <nav className={`nav-menu${open ? ' open' : ''}`}>
          <NavLink to="/" className={cls} onClick={() => setOpen(false)}>Accueil</NavLink>
          <NavLink to="/recherche" className={cls} onClick={() => setOpen(false)}>Trouver un pro</NavLink>
          {token ? (
            <>
              <NavLink to="/tableau-de-bord" className={cls} onClick={() => setOpen(false)}>Tableau de bord</NavLink>
              <NavLink to="/messagerie" className={cls} onClick={() => setOpen(false)}>Messagerie</NavLink>
            </>
          ) : null}
          {user?.isAdmin ? (
            <NavLink to="/admin" className={cls} onClick={() => setOpen(false)}>Admin</NavLink>
          ) : null}
        </nav>

        <div className="nav-right">
          {token ? (
            <>
              <button type="button" className="role-toggle" onClick={switchRole} title="Basculer de vue">
                {roleMode === 'CLIENT' ? '👷 Prestataire' : '🙋 Client'}
              </button>
              <Link to="/mon-compte" className="avatar-btn" title={user.fullName}>
                {user.fullName.slice(0, 1).toUpperCase()}
              </Link>
              <button type="button" className="logout-btn" onClick={() => { logout(); navigate('/'); }} title="Se déconnecter">
                ⎋
              </button>
            </>
          ) : (
            <>
              <Link to="/connexion" className="btn btn-ghost">Connexion</Link>
              <Link to="/inscription" className="btn btn-primary">Inscription</Link>
            </>
          )}
          <button type="button" className="burger" onClick={() => setOpen(!open)} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}