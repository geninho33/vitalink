import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';

/**
 * Itens do bottom-nav do index.html legado.
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
    icon: 'circle-user',
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
    icon: 'agenda-square',
    kind: 'route',
    to: '/agenda',
    description: 'Compromissos e consultas',
  },
  {
    id: 'corpo',
    label: 'Corpo',
    icon: 'target',
    kind: 'local',
    action: 'open-corpo',
    description: 'Mapa corporal e especialidades',
  },
  {
    id: 'timeline',
    label: 'Linha',
    icon: 'arrow-up-right',
    kind: 'route',
    to: '/timeline',
    description: 'Linha do tempo clínica',
  },
  {
    id: 'medicamentos',
    label: 'Meds',
    icon: 'sparkle',
    kind: 'route',
    to: '/rotina',
    description: 'Medicamentos e rotina',
  },
  {
    id: 'documentos',
    label: 'Docs',
    icon: 'file-list',
    kind: 'local',
    action: 'open-docs',
    description: 'Biblioteca de documentos',
  },
];

/**
 * Footer fixo de navegação (bottom-nav do index.html).
 */
export default function QuickNavMenu({
  activeId = 'inicio',
  onLocalAction,
  className = '',
}) {
  const navigate = useNavigate();

  function handleSelect(item) {
    if (item.kind === 'route' && item.to) {
      navigate(item.to);
      return;
    }
    if (typeof onLocalAction === 'function') {
      onLocalAction(item);
    }
  }

  return (
    <footer
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#d8e4e4] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(24,59,66,0.06)] ${className}`}
      aria-label="Navegação principal"
    >
      <nav className="mx-auto flex w-full max-w-3xl items-stretch justify-between px-1 pt-1.5 pb-1.5 sm:px-2">
        {QUICK_NAV_ITEMS.map((item) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              title={item.description}
              onClick={() => handleSelect(item)}
              className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 transition
                ${selected ? 'text-aqua-deep' : 'text-[#8a9aa0] hover:text-aqua'}`}
            >
              <Icon
                name={item.icon}
                className={`h-[1.35rem] w-[1.35rem] ${selected ? 'text-aqua-deep' : 'text-[#8a9aa0]'}`}
              />
              <span
                className={`text-[10px] leading-tight sm:text-[11px] ${
                  selected ? 'font-semibold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </footer>
  );
}
