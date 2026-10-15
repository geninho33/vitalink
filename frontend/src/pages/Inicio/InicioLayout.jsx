import { Link, Outlet, useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';
import { EmptyState, PageTitle } from './ui';

export default function InicioLayout() {
  const { pacienteId, loading } = usePacienteAtivo();
  const location = useLocation();
  const naTelaSinais = location.pathname.startsWith('/inicio/sinais');

  if (!loading && !pacienteId) {
    return (
      <div className="relative mx-auto max-w-4xl overflow-x-hidden pb-24">
        <PageTitle
          eyebrow="Início"
          title="Cadastre um paciente"
          description="É necessário ter ao menos um paciente ativo para usar o módulo Início."
        />
        <EmptyState>Conclua o cadastro do paciente para continuar.</EmptyState>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-4xl overflow-x-hidden pb-24">
      <div className="min-h-[50vh]">
        <Outlet />
      </div>
      {pacienteId ? <BottomNavigation /> : null}
      {pacienteId && !naTelaSinais ? (
        <Link
          to="/inicio/sinais"
          aria-label="Registrar sinal vital"
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-aqua px-5 text-base font-bold text-white shadow-panel transition hover:bg-aqua-deep lg:bottom-24"
        >
          <span className="text-2xl leading-none">+</span> Registrar
        </Link>
      ) : null}
    </div>
  );
}
