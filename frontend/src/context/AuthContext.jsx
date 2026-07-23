import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { clearSession, loadSession, persistSession } from '../services/session';
import { loginRequest } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());

  const login = useCallback(async ({ email, senha }) => {
    const data = await loginRequest({ email, senha });
    persistSession(data);
    setSession({
      token: data.token,
      usuario: data.usuario,
      menus: data.menus || [],
    });
    return data;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      usuario: session?.usuario || null,
      menus: session?.menus || [],
      login,
      logout,
    }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
