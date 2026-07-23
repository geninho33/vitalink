import PageHeader, { PlaceholderCard } from '../components/PageHeader';

export default function UsuariosPage() {
  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Cadastro, edição, bloqueio e atribuição de perfis."
      />
      <PlaceholderCard>
        <p className="text-sm text-slate-health">
          Em breve: tabela de usuários com filtros e ações de bloqueio/perfil.
        </p>
      </PlaceholderCard>
    </div>
  );
}
