import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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