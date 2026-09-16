import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './auth.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import ProviderProfile from './pages/ProviderProfile.jsx';
import RequestForm from './pages/RequestForm.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Onboarding from './pages/Onboarding.jsx';
import RequestDetail from './pages/RequestDetail.jsx';
import Messenger from './pages/Messenger.jsx';
import ConversationPage from './pages/ConversationPage.jsx';
import PrestationPage from './pages/PrestationPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import Jobs from './pages/Jobs.jsx';
import JobDetail from './pages/JobDetail.jsx';
import JobForm from './pages/JobForm.jsx';
import Legal from './pages/Legal.jsx';
import ProProfile from './pages/ProProfile.jsx';
import ProEdit from './pages/ProEdit.jsx';

const TITLES = {
  home: 'Prestata — Trouvez un artisan ou un freelance près de chez vous',
  search: 'Rechercher un prestataire — Prestata',
  jobs: "Offres d'emploi — Prestata",
  jobNew: "Publier une offre d'emploi — Prestata",
  jobEdit: "Modifier une offre d'emploi — Prestata",
  jobDetail: "Offre d'emploi — Prestata",
  login: 'Connexion — Prestata',
  signup: 'Inscription — Prestata',
  legal: 'Informations légales — Prestata',
  profile: 'Profil professionnel — Prestata',
  profileEdit: 'Modifier mon profil — Prestata',
};

function usePageTitle() {
  const location = useLocation();
  useEffect(() => {
    const p = location.pathname;
    let title = TITLES.home;
    if (p.startsWith('/recherche')) title = TITLES.search;
    else if (p.startsWith('/emplois/nouvelle')) title = TITLES.jobNew;
    else if (p.match(/^\/emplois\/[^/]+\/modifier/)) title = TITLES.jobEdit;
    else if (p.startsWith('/emplois')) title = p === '/emplois' ? TITLES.jobs : TITLES.jobDetail;
    else if (p.startsWith('/profil/modifier')) title = TITLES.profileEdit;
    else if (p.startsWith('/profil')) title = TITLES.profile;
    else if (p.startsWith('/connexion')) title = TITLES.login;
    else if (p.startsWith('/inscription')) title = TITLES.signup;
    else if (p === '/mentions-legales' || p === '/conditions-utilisation' || p === '/confidentialite') title = TITLES.legal;
    document.title = title;
  }, [location.pathname]);
}

function RequireAuth({ children }) {
  const { token, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (!token) return <Navigate to="/connexion" state={{ from: location }} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { token, user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (!token) return <Navigate to="/connexion" state={{ from: location }} replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  usePageTitle();
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recherche" element={<Search />} />
          <Route path="/prestataire/:id" element={<ProviderProfile />} />
          <Route
            path="/prestataire/:id/demande"
            element={
              <RequireAuth>
                <RequestForm />
              </RequireAuth>
            }
          />
          <Route path="/emplois" element={<Jobs />} />
          <Route path="/emplois/nouvelle" element={<RequireAuth><JobForm /></RequireAuth>} />
          <Route path="/emplois/:id/modifier" element={<RequireAuth><JobForm /></RequireAuth>} />
          <Route path="/emplois/:id" element={<JobDetail />} />
          <Route path="/profil/modifier" element={<RequireAuth><ProEdit /></RequireAuth>} />
          <Route path="/profil/:id" element={<ProProfile />} />
          <Route path="/mentions-legales" element={<Legal page="legal" />} />
          <Route path="/conditions-utilisation" element={<Legal page="terms" />} />
          <Route path="/confidentialite" element={<Legal page="privacy" />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Signup />} />
          <Route
            path="/devenir-prestataire"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />
          <Route
            path="/tableau-de-bord"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/demande/:id"
            element={
              <RequireAuth>
                <RequestDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/messagerie"
            element={
              <RequireAuth>
                <Messenger />
              </RequireAuth>
            }
          />
          <Route
            path="/messagerie/:id"
            element={
              <RequireAuth>
                <ConversationPage />
              </RequireAuth>
            }
          />
          <Route
            path="/prestation/:id"
            element={
              <RequireAuth>
                <PrestationPage />
              </RequireAuth>
            }
          />
          <Route
            path="/mon-compte"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}