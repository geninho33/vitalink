import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConsentGate from './ConsentGate';
import { usePacienteAtivo } from '../context/PacienteAtivoContext';
import {
  isPacienteGatePath,
  isSelfCareGatePath,
  pacienteGateTarget,
} from '../utils/pacienteGate';
import { isPacienteOuAutocuidado } from '../utils/perfis';

const FREE_PATHS = ['/meus-dados', '/onboarding', '/termos'];

function canAccessPath(pathname, menus) {
  if (FREE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  const list = Array.isArray(menus) ? menus : [];
  return list.some((m) => {
    const rota = m.rota || m.path;
    if (!rota) return false;
    return pathname === rota || pathname.startsWith(`${rota}/`);
  });
}

export default function ProtectedRoute() {
  const { isAuthenticated, sessionChecked } = useAuth();
  const location = useLocation();

  if (!sessionChecked) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // LGPD: sem aceite da versão vigente dos documentos obrigatórios, o app fica bloqueado.
  return (
    <ConsentGate>
      <ProtectedContent />
    </ConsentGate>
  );
}

function ProtectedContent() {
  const { requerOnboarding, menus, usuario } = useAuth();
  const { pacientes, loading: loadingPacientes, ready: pacientesReady } = usePacienteAtivo();
  const location = useLocation();

  if (requerOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (
    !requerOnboarding &&
    pacientesReady &&
    !loadingPacientes &&
    pacientes.length === 0
  ) {
    const selfCare = isPacienteOuAutocuidado(usuario);
    const allowedEmpty = selfCare
      ? isSelfCareGatePath(location.pathname)
      : isPacienteGatePath(location.pathname);
    if (!allowedEmpty) {
      const target = pacienteGateTarget(usuario);
      if (target !== location.pathname) {
        return <Navigate to={target} replace />;
      }
    }
  }

  if (
    location.pathname !== '/onboarding' &&
    !canAccessPath(location.pathname, menus)
  ) {
    const fallback =
      menus.find((m) => m.rota)?.rota || '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
