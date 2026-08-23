import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../BrandLogo';
import Icon from '../Icon';
import { getInitials } from '../../utils/menuTree';
import { useAuth } from '../../context/AuthContext';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';
import { pacienteGateTarget } from '../../utils/pacienteGate';

function labelPapel(papel) {
  if (!papel) return 'Sem perfil';
  const base = papel.rotulo || papel.perfil_nome || 'Perfil';
  if (papel.paciente_nome) return `${base} · ${papel.paciente_nome}`;
  return base;
}

export default function Header({ onOpenMobile, usuario, locked }) {
  const { logout, papeis, switchContext } = useAuth();
  const { pacientes, pacienteId, setPacienteId, paciente } = usePacienteAtivo();
  const navigate = useNavigate();
  const showPacienteSelector = pacientes.length > 0;
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef(null);

  const nome = usuario?.nome || 'Usuário';
  const perfilAtivo =
    usuario?.papel_ativo?.rotulo ||
    usuario?.perfil?.nome ||
    'Sem perfil';
  const papelAtivoId = usuario?.papel_ativo?.id ?? null;
  const perfilAtivoId = usuario?.perfil?.id ?? null;
  const initials = getInitials(nome);
  const multiPerfil = Array.isArray(papeis) && papeis.length > 1;

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  function handleLogout() {
    setOpen(false);
    logout();
  }

  async function handleSwitch(papel) {
    if (switching) return;
    const alreadyActive =
      (papel.id != null && Number(papel.id) === Number(papelAtivoId)) ||
      (papel.id == null &&
        Number(papel.perfil_id) === Number(perfilAtivoId) &&
        !papel.paciente_id);
    if (alreadyActive) {
      setOpen(false);
      return;
    }

    setSwitching(true);
    try {
      await switchContext({
        papel_id: papel.id,
        perfil_id: papel.perfil_id,
        paciente_id: papel.paciente_id,
      });
      setOpen(false);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      window.alert(err?.message || 'Não foi possível trocar o perfil.');
    } finally {
      setSwitching(false);
    }
  }

  return (
    <header className="sticky top-0 z-[70] flex h-16 min-w-0 items-center justify-between gap-2 border-b border-[#d7e8e7] bg-white/90 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobile}
          className="grid h-10 w-10 place-items-center rounded-xl border border-[#d7e8e7] text-aqua-deep transition hover:bg-aqua-soft lg:hidden"
          aria-label="Abrir menu"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-3 sm:flex">
          <BrandLogo variant="compact" className="lg:hidden" />
          <div className="hidden md:block">
            <p className="text-xs font-bold uppercase tracking-wider text-vita">Painel</p>
            <p className="text-sm text-slate-health">Gestão de saúde e acessos</p>
          </div>
        </div>
      </div>

      {locked ? (
        <button
          type="button"
          onClick={() => navigate(pacienteGateTarget(usuario))}
          className="min-w-0 truncate rounded-2xl bg-vita px-3 py-2 text-xs font-semibold text-white sm:text-sm"
        >
          Cadastrar paciente
        </button>
      ) : showPacienteSelector ? (
        <label className="flex min-w-0 max-w-[11rem] flex-1 items-center gap-2 rounded-2xl border border-[#d7e8e7] bg-[#f8fcfc] px-2 py-1.5 sm:max-w-xs sm:px-3">
          <Icon name="user" className="h-4 w-4 shrink-0 text-vita" />
          <span className="sr-only">Paciente ativo</span>
          <select
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            title={paciente?.nome || 'Paciente ativo'}
          >
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="relative z-[80] shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex max-w-full items-center gap-3 rounded-2xl border border-[#d7e8e7] bg-[#f8fcfc] py-1.5 pl-1.5 pr-3 transition hover:border-aqua/40 hover:bg-aqua-soft/60"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-aqua text-sm font-bold text-white">
            {initials}
          </span>
          <span className="hidden min-w-0 text-left md:block">
            <span className="block truncate text-sm font-semibold text-ink">{nome}</span>
            <span className="block truncate text-xs text-slate-health">{perfilAtivo}</span>
          </span>
          <Icon
            name="chevron"
            className={`h-4 w-4 text-slate-health transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div
          className={`absolute right-0 mt-2 flex w-72 max-h-[min(28rem,70vh)] origin-top-right flex-col overflow-hidden rounded-2xl border border-[#d7e8e7] bg-white shadow-panel transition-all duration-200 ${
            open
              ? 'pointer-events-auto visible scale-100 opacity-100'
              : 'pointer-events-none invisible scale-95 opacity-0'
          }`}
          role="menu"
        >
          <div className="shrink-0 border-b border-[#e8f1f0] px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{nome}</p>
            <p className="truncate text-xs text-slate-health">{perfilAtivo}</p>
          </div>

          {multiPerfil ? (
            <div className="min-h-0 flex-1 overflow-y-auto border-b border-[#e8f1f0] p-1.5">
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-health">
                Trocar perfil
              </p>
              {papeis.map((papel) => {
                const active =
                  (papel.id != null && Number(papel.id) === Number(papelAtivoId)) ||
                  (papel.id == null &&
                    Number(papel.perfil_id) === Number(perfilAtivoId) &&
                    !papel.paciente_id);
                return (
                  <button
                    key={papel.id ?? `p-${papel.perfil_id}-${papel.paciente_id || 0}`}
                    type="button"
                    role="menuitem"
                    disabled={switching}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? 'bg-aqua-soft font-semibold text-aqua-deep'
                        : 'text-ink hover:bg-aqua-soft'
                    } disabled:opacity-60`}
                    onClick={() => handleSwitch(papel)}
                  >
                    <Icon name="masks" className="h-4 w-4 shrink-0 text-aqua" />
                    <span className="min-w-0 truncate">{labelPapel(papel)}</span>
                    {active ? (
                      <span className="ml-auto shrink-0 text-[10px] font-bold uppercase text-aqua">
                        Ativo
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="sticky bottom-0 shrink-0 bg-white p-1.5">
            <button
              type="button"
              role="menuitem"
              className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-ink transition hover:bg-aqua-soft"
              onClick={() => {
                setOpen(false);
                navigate('/meus-dados');
              }}
            >
              <Icon name="user" className="h-4 w-4 text-aqua" />
              Meus Dados
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
              onClick={handleLogout}
            >
              <Icon name="logout" className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
