import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '../../components/Icon';
import { BOTTOM_NAV_ITEMS } from './navItems';

const PRIMARY_IDS = ['inicio', 'agenda', 'medicamentos', 'documentos'];

function NavItem({ item, onNavigate, compact }) {
  return (
    <NavLink
      to={item.path}
      end={Boolean(item.end)}
      title={item.label}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition ${
          compact ? 'min-h-14 flex-none flex-row justify-start gap-3 px-3' : ''
        } ${isActive ? 'text-aqua-deep' : 'text-[#8a9aa0] hover:text-aqua'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            name={item.icon}
            className={`h-6 w-6 shrink-0 ${isActive ? 'text-aqua-deep' : 'text-[#8a9aa0]'}`}
          />
          <span
            className={`text-center text-[10px] leading-tight sm:text-[11px] ${
              compact ? 'text-sm font-semibold' : ''
            } ${isActive ? 'font-semibold' : 'font-medium'}`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNavigation() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = BOTTOM_NAV_ITEMS;

  const primary = useMemo(
    () => items.filter((item) => PRIMARY_IDS.includes(item.id)),
    [items]
  );
  const moreItems = useMemo(
    () => items.filter((item) => !PRIMARY_IDS.includes(item.id)),
    [items]
  );
  const moreActive = moreItems.some((item) =>
    item.end
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    function onEsc(e) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [moreOpen]);

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-3xl px-2 transition lg:hidden ${
          moreOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <nav
          aria-label="Mais opções do Início"
          className={`mb-1 origin-bottom rounded-2xl border border-[#d7e8e7] bg-white p-2 shadow-panel transition ${
            moreOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-health">
            Mais
          </p>
          <div className="grid grid-cols-1 gap-1">
            {moreItems.map((item) => (
              <NavItem key={item.id} item={item} compact onNavigate={() => setMoreOpen(false)} />
            ))}
          </div>
        </nav>
      </div>

      <footer
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d8e4e4] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(24,59,66,0.06)]"
        aria-label="Navegação principal"
      >
        <nav className="mx-auto hidden w-full max-w-5xl items-stretch justify-between gap-0.5 px-2 pt-1 pb-1 lg:flex">
          {items.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>

        <nav className="mx-auto flex w-full max-w-3xl items-stretch justify-between gap-0.5 px-1 pt-1 pb-1 sm:px-2 lg:hidden">
          {primary.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            aria-label="Abrir mais opções"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition ${
              moreOpen || moreActive ? 'text-aqua-deep' : 'text-[#8a9aa0] hover:text-aqua'
            }`}
          >
            <Icon
              name="menu"
              className={`h-6 w-6 ${moreOpen || moreActive ? 'text-aqua-deep' : 'text-[#8a9aa0]'}`}
            />
            <span
              className={`text-[10px] leading-tight sm:text-[11px] ${
                moreOpen || moreActive ? 'font-semibold' : 'font-medium'
              }`}
            >
              Mais
            </span>
          </button>
        </nav>
      </footer>
    </>
  );
}
