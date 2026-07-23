import { useAuth } from '../context/AuthContext';
import PageHeader, { PlaceholderCard } from '../components/PageHeader';

export default function DashboardPage() {
  const { usuario, menus } = useAuth();

  return (
    <div>
      <PageHeader
        title={`Olá, ${usuario?.nome?.split(' ')[0] || 'bem-vindo'}`}
        description="Acompanhe rotinas de cuidado, acessos e indicadores do VitaLink."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PlaceholderCard>
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">Perfil</p>
          <p className="mt-2 text-lg font-semibold text-ink">{usuario?.perfil?.nome}</p>
          <p className="mt-1 text-sm text-slate-health">{usuario?.email}</p>
        </PlaceholderCard>
        <PlaceholderCard>
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">Menus liberados</p>
          <p className="mt-2 text-3xl font-bold text-ink">{menus.length}</p>
          <p className="mt-1 text-sm text-slate-health">Itens retornados por /menus/me</p>
        </PlaceholderCard>
        <PlaceholderCard>
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">LGPD</p>
          <p className="mt-2 text-sm text-slate-health">
            Auditoria sanitizada ativa — sem exposição de dados clínicos em logs.
          </p>
        </PlaceholderCard>
      </div>
    </div>
  );
}
