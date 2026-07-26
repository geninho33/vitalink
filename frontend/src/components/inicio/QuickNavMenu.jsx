import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { useAuth } from '../../context/AuthContext';

/**
 * Itens extraídos do bottom-nav do index.html legado.
 * kind: 'route' navega; 'local' dispara ação na página Início.
 */
export const QUICK_NAV_ITEMS = [
  {
    id: 'inicio',
    label: 'Início',
    icon: 'home',
    kind: 'local',
    action: 'focus-inicio',
    description: 'Visão geral e registros do dia',
  },
  {
    id: 'perfil',
    label: 'Perfil',
    icon: 'user',
    kind: 'route',
    to: '/meus-dados',
    description: 'Dados pessoais e ficha',
  },
  {
    id: 'eventos',
    label: 'Eventos',
    icon: 'plus',
    kind: 'local',
    action: 'open-eventos',
    description: 'Registrar ou filtrar eventos de saúde',
  },
  {
    id: 'agenda',
    label: 'Agenda',
    icon: 'calendar',
    kind: 'route',
    to: '/agenda',
    requireMenu: '/agenda',
    description: 'Compromissos e consultas',
  },
  {
    id: 'corpo',
    label: 'Corpo',
    icon: 'body',
    kind: 'local',
    action: 'open-corpo',
    description: 'Mapa corporal e especialidades',
  },
  {
    id: 'timeline',
    label: 'Linha',
    icon: 'scroll-text',
    kind: 'route',
    to: '/timeline',
    requireMenu: '/timeline',
    description: 'Linha do tempo clínica',
  },
  {
    id: 'medicamentos',
    label: 'Meds',
    icon: 'pill',
    kind: 'route',
    to: '/rotina',
    requireMenu: '/rotina',
    description: 'Medicamentos e rotina',
  },
  {
    id: 'documentos',
    label: 'Docs',
    icon: 'file-text',
    kind: 'local',
    action: 'open-docs',
    description: 'Biblioteca de documentos',
  },
];

function canAccessRoute(menus, requireMenu, to) {
  if (!requireMenu && !to) return true;
  if (!requireMenu) return true;
  const routes = new Set(
    (menus || []).map((m) => m.rota).filter(Boolean)
  );
  return routes.has(requireMenu);
}

/**
 * Painel de acesso rápido (bottom-nav do index.html → sub-header na Início).
 * Mobile: scroll horizontal; desktop: faixa completa.
 */
export default function QuickNavMenu({
  activeId = 'inicio',
  onLocalAction,
  className = '',
}) {
  const navigate = useNavigate();
  const { menus } = useAuth();

  const items = useMemo(
    () =>
      QUICK_NAV_ITEMS.filter((item) => {
        if (item.kind === 'local') return true;
        return canAccessRoute(menus, item.requireMenu, item.to);
      }),
    [menus]
  );

  function handleSelect(item) {
    if (item.kind === 'route' && item.to) {
      navigate(item.to);
      return;
    }
    if (typeof onLocalAction === 'function') {
      onLocalAction(item);
    }
  }

  function handleSelectChange(e) {
    const item = items.find((i) => i.id === e.target.value);
    if (item) handleSelect(item);
  }

  return (
    <section
      className={`rounded-2xl border border-[#d7e8e7] bg-white p-3 shadow-sm sm:p-4 ${className}`}
      aria-label="Acesso rápido"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">Acesso rápido</p>
          <p className="text-sm text-slate-health">
            Atalhos do app legado — módulos e ações da página Início
          </p>
        </div>

        {/* Mobile: dropdown complementar ao carrossel */}
        <label className="grid gap-1 text-xs font-semibold text-ink sm:hidden">
          <span className="sr-only">Ir para</span>
          <select
            className="min-h-11 min-w-[9.5rem] rounded-xl border border-[#cfe0df] bg-[#f8fcfc] px-3 text-sm outline-none focus:border-aqua focus:ring-2 focus:ring-aqua/20"
            value={activeId}
            onChange={handleSelectChange}
            aria-label="Navegação rápida"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Carrossel horizontal (mobile-first) / faixa em telas maiores */}
      <nav
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory scrollbar-thin"
        aria-label="Menu rápido do Início"
      >
        {items.map((item) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              title={item.description}
              onClick={() => handleSelect(item)}
              className={`snap-start flex min-h-[4.25rem] min-w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition
                sm:min-w-[5.5rem]
                ${
                  selected
                    ? 'bg-aqua text-white shadow-sm'
                    : 'bg-[#f4fbfa] text-ink hover:bg-aqua-soft hover:text-aqua-deep'
                }`}
            >
              <Icon
                name={item.icon}
                className={`h-5 w-5 ${selected ? 'text-white' : 'text-aqua-deep'}`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}
