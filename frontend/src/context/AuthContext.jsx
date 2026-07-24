import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, loadSession, persistSession } from '../services/session';
import {
  loginRequest,
  onUnauthorized,
  refreshSessionRequest,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());
  const navigate = useNavigate();

  const logout = useCallback(
    (opts = {}) => {
      clearSession();
      setSession(null);
      if (opts.redirect !== false) {
        navigate('/login', { replace: true });
      }
    },
    [navigate]
  );

  useEffect(() => {
    return onUnauthorized((message) => {
      clearSession();
      setSession(null);
      try {
        window.alert(
          message ||
            'Sua sessão expirou ou suas permissões foram alteradas. Por favor, faça login novamente.'
        );
      } catch {
        /* ignore */
      }
      navigate('/login', { replace: true });
    });
  }, [navigate]);

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

  /** Atualiza usuario/menus sem trocar o JWT. */
  const refreshSession = useCallback(async () => {
    const data = await refreshSessionRequest();
    setSession((prev) => {
      if (!prev?.token) return prev;
      return {
        token: prev.token,
        usuario: data.usuario || prev.usuario,
        menus: data.menus || [],
      };
    });
    return data;
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      usuario: session?.usuario || null,
      menus: session?.menus || [],
      login,
      logout,
      refreshSession,
    }),
    [session, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
