import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

/**
 * Contêiner do módulo Início: conteúdo da view ativa + footer fixo.
 */
export default function InicioLayout() {
  return (
    <div className="relative mx-auto max-w-3xl pb-20">
      <div className="min-h-[50vh]">
        <Outlet />
      </div>
      <BottomNavigation />
    </div>
  );
}
