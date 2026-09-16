import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="brand"><span className="brand-mark">P</span> Prestata</div>
          <p className="muted">La place de marché des artisans, freelances et offres d'emploi.</p>
        </div>
        <div className="footer-links">
          <strong className="footer-title">Services</strong>
          <Link to="/recherche">Trouver un pro</Link>
          <Link to="/emplois">Offres d'emploi</Link>
          <Link to="/inscription">Devenir prestataire</Link>
        </div>
        <div className="footer-links">
          <strong className="footer-title">Emploi</strong>
          <Link to="/emplois">Parcourir les offres</Link>
          <Link to="/emplois/nouvelle">Publier une offre</Link>
          <Link to="/recherche?mode=DIGITAL">Freelances en ligne</Link>
        </div>
        <div className="footer-links">
          <strong className="footer-title">Informations</strong>
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/conditions-utilisation">Conditions d'utilisation</Link>
          <Link to="/confidentialite">Confidentialité</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span className="muted">© {new Date().getFullYear()} Prestata — Plateforme de mise en relation clients, prestataires et recruteurs.</span>
      </div>
    </footer>
  );
}