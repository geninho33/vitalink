import PageHeader, { PlaceholderCard } from '../components/PageHeader';

export default function PerfisPage() {
  return (
    <div>
      <PageHeader
        title="Perfis"
        description="Gestão de papéis (Administrador, Médico, Cuidador, Atendente) e menus permitidos."
      />
      <PlaceholderCard>
        <p className="text-sm text-slate-health">
          Em breve: CRUD de perfis e vinculação de menus.
        </p>
      </PlaceholderCard>
    </div>
  );
}
