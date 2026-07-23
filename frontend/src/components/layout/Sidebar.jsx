import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '../Icon';
import { buildMenuTree } from '../../utils/menuTree';

function isPathActive(pathname, rota) {
  if (!rota) return false;
  return pathname === rota || pathname.startsWith(`${rota}/`);
}

function NavItem({ item, collapsed, onNavigate }) {
  const location = useLocation();
  const hasChildren = item.children?.length > 0;
  const childActive = hasChildren
    ? item.children.some((c) => isPathActive(location.pathname, c.rota))
    : false;
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={item.titulo}
          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
            childActive
              ? 'bg-white/15 text-white'
              : 'text-white/80 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icon name={item.icone || 'building'} className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.titulo}</span>
              <Icon
                name="chevron"
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
        </button>
        <div
          className={`grid transition-all duration-300 ease-out ${
            open && !collapsed ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="ml-3 space-y-1 border-l border-white/15 pl-3 pb-1">
              {item.children.map((child) => (
                <NavLink
                  key={child.id}
                  to={child.rota}
                  onClick={onNavigate}
                  title={child.titulo}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                      isActive
                        ? 'bg-mint/25 font-semibold text-white'
                        : 'text-white/75 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon name={child.icone || 'dot'} className="h-4 w-4 shrink-0" />
                  <span className="truncate">{child.titulo}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item.rota) return null;

  return (
    <NavLink
      to={item.rota}
      onClick={onNavigate}
      title={item.titulo}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
          isActive
            ? 'bg-white text-aqua-deep shadow-sm'
            : 'text-white/85 hover:bg-white/10 hover:text-white'
        } ${collapsed ? 'justify-center' : ''}`
      }
    >
      <Icon name={item.icone || 'layout-dashboard'} className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.titulo}</span>}
    </NavLink>
  );
}

export default function Sidebar({
  menus,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}) {
  const tree = useMemo(() => buildMenuTree(menus), [menus]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onCloseMobile}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-aqua-deep via-aqua to-[#1f7d82] text-white shadow-panel transition-all duration-300
          ${collapsed ? 'w-[78px]' : 'w-[272px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className={`flex h-16 items-center gap-3 border-b border-white/10 px-4 ${collapsed ? 'justify-center' : ''}`}>
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 font-display text-sm font-bold">
            VL
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display text-base font-bold tracking-tight">VitaLink</p>
              <p className="truncate text-[11px] text-white/70">Cuidado contínuo</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {tree.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              onNavigate={onCloseMobile}
            />
          ))}
        </nav>

        <div className="hidden border-t border-white/10 p-3 lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <Icon name="panel-left" className="h-5 w-5" />
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
