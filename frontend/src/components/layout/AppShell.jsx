import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';
import { filterMenusWithoutPatient } from '../../utils/pacienteGate';

export default function AppShell() {
  const { usuario, menus, refreshSession } = useAuth();
  const { pacientes, loading, reload } = usePacienteAtivo();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const locked = !loading && pacientes.length === 0;
  const visibleMenus = useMemo(
    () => (locked ? filterMenusWithoutPatient(menus) : menus),
    [locked, menus]
  );

  useEffect(() => {
    refreshSession().catch(() => {});
  }, [refreshSession]);

  useEffect(() => {
    reload().catch(() => {});
  }, [location.pathname, reload]);

  return (
    <div className="min-h-screen bg-[#eef6f7]">
      <Sidebar
        menus={visibleMenus}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        locked={locked}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          collapsed ? 'lg:pl-[78px]' : 'lg:pl-[272px]'
        }`}
      >
        <Header
          usuario={usuario}
          locked={locked}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
