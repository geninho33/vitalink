import PageHeader, { PlaceholderCard } from '../components/PageHeader';

export default function AcessosPage() {
  return (
    <div>
      <PageHeader
        title="Acessos (RBAC)"
        description="Matriz de permissões por perfil e menu (Ler, Criar, Editar, Deletar)."
      />
      <PlaceholderCard>
        <p className="text-sm text-slate-health">
          Em breve: matriz interativa de permissões alinhada a permissoes_acesso.
        </p>
      </PlaceholderCard>
    </div>
  );
}
