import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'vitalink-inicio-paciente-id';
const PacienteAtivoContext = createContext(null);

function readStoredId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function PacienteAtivoProvider({ children }) {
  const { isAuthenticated, sessionChecked, usuario } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteIdState] = useState(readStoredId);
  const [loading, setLoading] = useState(false);

  const setPacienteId = useCallback((id) => {
    const value = id == null ? '' : String(id);
    setPacienteIdState(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setPacientes([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest('/my-patients');
      const list = res.data || [];
      setPacientes(list);
      setPacienteIdState((current) => {
        const inList = (id) => list.some((p) => String(p.id) === String(id));
        const stored = current || readStoredId();
        const fromToken = usuario?.paciente_ativo_id ? String(usuario.paciente_ativo_id) : '';
        const next = inList(stored)
          ? String(stored)
          : inList(fromToken)
            ? fromToken
            : list[0]
              ? String(list[0].id)
              : '';
        try {
          if (next) localStorage.setItem(STORAGE_KEY, next);
          else localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch {
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, usuario?.paciente_ativo_id]);

  useEffect(() => {
    if (!sessionChecked) return;
    reload();
  }, [reload, sessionChecked]);

  const paciente = useMemo(
    () => pacientes.find((p) => String(p.id) === String(pacienteId)) || null,
    [pacientes, pacienteId]
  );

  const value = useMemo(
    () => ({
      pacientes,
      pacienteId,
      paciente,
      setPacienteId,
      loading,
      reload,
    }),
    [pacientes, pacienteId, paciente, setPacienteId, loading, reload]
  );

  return <PacienteAtivoContext.Provider value={value}>{children}</PacienteAtivoContext.Provider>;
}

export function usePacienteAtivo() {
  const ctx = useContext(PacienteAtivoContext);
  if (!ctx) throw new Error('usePacienteAtivo deve ser usado dentro de PacienteAtivoProvider');
  return ctx;
}
