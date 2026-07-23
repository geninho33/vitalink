import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import MeusDadosPage from './pages/MeusDadosPage';
import { HospitaisPage, FarmaciasPage } from './pages/saude/EstabelecimentosPages';
import { CuidadoresPage, ResponsaveisPage } from './pages/saude/PessoasPages';
import { MedicosPage, PacientesPage, RemediosPage } from './pages/saude/ClinicosPages';
import {
  UsuariosPage,
  PerfisPage,
  AcessosPage,
  AuditoriaPage,
} from './pages/admin/AdminPages';
import {
  AgendaPage,
  ConsultasPage,
  RotinaPage,
  TimelinePage,
} from './pages/atividades/AtividadesPages';

function PublicOnly({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/medicos" element={<MedicosPage />} />
          <Route path="/remedios" element={<RemediosPage />} />
          <Route path="/hospitais" element={<HospitaisPage />} />
          <Route path="/farmacias" element={<FarmaciasPage />} />
          <Route path="/cuidadores" element={<CuidadoresPage />} />
          <Route path="/responsaveis" element={<ResponsaveisPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/consultas" element={<ConsultasPage />} />
          <Route path="/rotina" element={<RotinaPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/perfis" element={<PerfisPage />} />
          <Route path="/acessos" element={<AcessosPage />} />
          <Route path="/auditoria" element={<AuditoriaPage />} />
          <Route path="/meus-dados" element={<MeusDadosPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
