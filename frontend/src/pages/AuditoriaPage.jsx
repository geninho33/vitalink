import PageHeader, { PlaceholderCard } from '../components/PageHeader';

export default function AuditoriaPage() {
  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Trilha de logs sanitizados — sem dados clínicos sensíveis (LGPD)."
      />
      <PlaceholderCard>
        <p className="text-sm text-slate-health">
          Em breve: painel de auditoria_logs com filtros por ação, recurso e período.
        </p>
      </PlaceholderCard>
    </div>
  );
}
