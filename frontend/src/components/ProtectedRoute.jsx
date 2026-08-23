import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePacienteAtivo } from '../context/PacienteAtivoContext';
import { isPacienteGatePath, pacienteGateTarget } from '../utils/pacienteGate';

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
  const { isAuthenticated, requerOnboarding, menus, usuario } = useAuth();
  const { pacientes, loading: loadingPacientes } = usePacienteAtivo();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requerOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (
    !requerOnboarding &&
    !loadingPacientes &&
    pacientes.length === 0 &&
    !isPacienteGatePath(location.pathname)
  ) {
    return <Navigate to={pacienteGateTarget(usuario)} replace />;
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
