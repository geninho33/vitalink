import { NavLink } from 'react-router-dom';
import Icon from '../../components/Icon';
import { BOTTOM_NAV_ITEMS } from './navItems';

/**
 * Menu inferior fixo — equivalente ao .bottom-nav do index.html.
 * Permanece visível em todas as views do módulo Início.
 */
export default function BottomNavigation() {
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d8e4e4] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(24,59,66,0.06)]"
      aria-label="Navegação principal"
    >
      <nav className="mx-auto flex w-full max-w-3xl items-stretch justify-between px-1 pt-1.5 pb-1.5 sm:px-2">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={Boolean(item.end)}
            title={item.label}
            className={({ isActive }) =>
              `flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 transition ${
                isActive ? 'text-aqua-deep' : 'text-[#8a9aa0] hover:text-aqua'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  name={item.icon}
                  className={`h-[1.35rem] w-[1.35rem] ${isActive ? 'text-aqua-deep' : 'text-[#8a9aa0]'}`}
                />
                <span
                  className={`text-[10px] leading-tight sm:text-[11px] ${
                    isActive ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </footer>
  );
}
