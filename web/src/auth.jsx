import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
const MODE_KEY = 'prestata_role_mode';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('prestata_token') || null);
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('prestata_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [roleMode, setRoleModeState] = useState(() => localStorage.getItem(MODE_KEY) || 'CLIENT');
  const [loading, setLoading] = useState(Boolean(token));

  // Rafraîchir / valider le profil au démarrage
  useEffect(() => {
    if (!token) return;
    api('/api/auth/me', { token })
      .then((d) => {
        setUser(d.user);
        localStorage.setItem('prestata_user', JSON.stringify(d.user));
      })
      .catch(() => {
        localStorage.removeItem('prestata_token');
        localStorage.removeItem('prestata_user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const persistAuth = useCallback((newToken, newUser) => {
    localStorage.setItem('prestata_token', newToken);
    localStorage.setItem('prestata_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const login = useCallback(
    async (phone, password) => {
      const d = await api('/api/auth/login', {
        method: 'POST',
        body: { phone, password },
      });
      persistAuth(d.token, d.user);
      return d.user;
    },
    [persistAuth],
  );

  const signup = useCallback(
    async ({ fullName, phone, password }) => {
      const d = await api('/api/auth/signup', {
        method: 'POST',
        body: { fullName, phone, password },
      });
      persistAuth(d.token, d.user);
      return d;
    },
    [persistAuth],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('prestata_token');
    localStorage.removeItem('prestata_user');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const d = await api('/api/auth/me', { token });
    setUser(d.user);
    localStorage.setItem('prestata_user', JSON.stringify(d.user));
  }, [token]);

  const setRoleMode = useCallback((mode) => {
    localStorage.setItem(MODE_KEY, mode);
    setRoleModeState(mode);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        signup,
        logout,
        refreshUser,
        roleMode,
        setRoleMode,
        isClient: roleMode === 'CLIENT',
        isProviderMode: roleMode === 'PRESTATAIRE',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}