import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';
import { EmptyState, PageTitle } from './ui';

export default function InicioLayout() {
  const { pacienteId, loading } = usePacienteAtivo();

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
    </div>
  );
}
