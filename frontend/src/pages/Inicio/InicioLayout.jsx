import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import { useAuth } from '../../context/AuthContext';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';
import { EmptyState, PageTitle } from './ui';

/**
 * Início opera com um único paciente ativo. Sem seleção, só empty state.
 */
export default function InicioLayout() {
  const { usuario } = useAuth();
  const { paciente, pacienteId, loading } = usePacienteAtivo();
  const isAdmin = Number(usuario?.perfil?.id || usuario?.perfil_id) === 1;

  if (!isAdmin && !loading && !pacienteId) {
    return (
      <div className="relative mx-auto max-w-4xl pb-20">
        <PageTitle
          eyebrow="Início"
          title="Selecione o paciente ativo"
          description="O módulo Início atende um paciente por vez."
        />
        <EmptyState>
          Escolha o paciente no seletor do cabeçalho para continuar o atendimento.
        </EmptyState>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-4xl pb-20">
      {paciente ? (
        <p className="mb-4 rounded-2xl border border-[#d0e4ef] bg-vita-soft/70 px-4 py-2 text-sm text-ink">
          Atendimento de <strong>{paciente.nome}</strong>
          <span className="text-slate-health"> — alterne no cabeçalho se cuidar de mais de um paciente.</span>
        </p>
      ) : null}
      <div className="min-h-[50vh]">
        <Outlet />
      </div>
      <BottomNavigation />
    </div>
  );
}
