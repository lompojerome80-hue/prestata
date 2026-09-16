import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="brand"><span className="brand-mark">P</span> Prestata</div>
          <p className="muted">La place de marché des artisans & freelances.</p>
        </div>
        <div className="footer-links">
          <Link to="/recherche">Trouver un pro</Link>
          <Link to="/inscription">Devenir prestataire</Link>
          <Link to="/recherche?mode=DIGITAL">Freelances en ligne</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span className="muted">© {new Date().getFullYear()} Prestata — Plateforme de mise en relation clients et prestataires.</span>
      </div>
    </footer>
  );
}