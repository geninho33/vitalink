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
  switchContextRequest,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());
  const [sessionChecked, setSessionChecked] = useState(() => !loadSession()?.token);
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
    if (!session?.token) {
      setSessionChecked(true);
      return undefined;
    }
    let cancelled = false;
    refreshSessionRequest({ skipAuthRedirect: true })
      .then((data) => {
        if (cancelled) return;
        setSession((prev) => {
          if (!prev?.token) return prev;
          return {
            token: prev.token,
            usuario: data.usuario || prev.usuario,
            menus: data.menus || [],
            papeis: data.papeis ?? prev.papeis ?? [],
          };
        });
        setSessionChecked(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 401) {
          clearSession();
          setSession(null);
          navigate('/login', { replace: true });
        }
        setSessionChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      papeis: data.papeis || [],
    });
    return data;
  }, []);

  /** Atualiza usuario/menus/papéis sem trocar o JWT. */
  const refreshSession = useCallback(async () => {
    const data = await refreshSessionRequest();
    setSession((prev) => {
      if (!prev?.token) return prev;
      return {
        token: prev.token,
        usuario: data.usuario || prev.usuario,
        menus: data.menus || [],
        papeis: data.papeis ?? prev.papeis ?? [],
      };
    });
    return data;
  }, []);

  /** Profile Switch: novo JWT + menus do papel escolhido. */
  const switchContext = useCallback(async ({ papel_id, perfil_id, paciente_id } = {}) => {
    const data = await switchContextRequest({ papel_id, perfil_id, paciente_id });
    persistSession(data);
    setSession({
      token: data.token,
      usuario: data.usuario,
      menus: data.menus || [],
      papeis: data.papeis || [],
    });
    return data;
  }, []);

  const value = useMemo(
    () => ({
      session,
      sessionChecked,
      isAuthenticated: Boolean(session?.token),
      usuario: session?.usuario || null,
      menus: session?.menus || [],
      papeis: session?.papeis || [],
      requerOnboarding: session?.usuario?.onboarding_concluido === false,
      isAutocuidado: Number(session?.usuario?.perfil?.id) === 7,
      login,
      logout,
      refreshSession,
      switchContext,
    }),
    [session, sessionChecked, login, logout, refreshSession, switchContext]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
