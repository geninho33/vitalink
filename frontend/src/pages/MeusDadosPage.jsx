import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader, { PlaceholderCard } from '../components/PageHeader';

export default function MeusDadosPage() {
  const { usuario } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [msg, setMsg] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    if (!senhaAtual || !novaSenha) {
      setMsg('Preencha os campos de senha.');
      return;
    }
    if (novaSenha.length < 6) {
      setMsg('A nova senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirma) {
      setMsg('A confirmação não confere com a nova senha.');
      return;
    }
    setMsg('Alteração de senha será integrada à API em breve.');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Meus Dados"
        description="Edite suas informações pessoais e altere a senha de acesso."
      />
      <div className="grid gap-4">
        <PlaceholderCard>
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">Identificação</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-health">Nome</dt>
              <dd className="text-sm font-semibold text-ink">{usuario?.nome}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-health">E-mail</dt>
              <dd className="text-sm font-semibold text-ink">{usuario?.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-health">Perfil</dt>
              <dd className="text-sm font-semibold text-ink">{usuario?.perfil?.nome}</dd>
            </div>
          </dl>
        </PlaceholderCard>

        <PlaceholderCard>
          <p className="text-xs font-bold uppercase tracking-wider text-aqua">Alterar senha</p>
          <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">Senha atual</span>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="rounded-xl border border-[#cfe0df] bg-[#f8fcfc] px-3 py-2.5 outline-none focus:border-aqua focus:ring-2 focus:ring-aqua/20"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">Nova senha</span>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="rounded-xl border border-[#cfe0df] bg-[#f8fcfc] px-3 py-2.5 outline-none focus:border-aqua focus:ring-2 focus:ring-aqua/20"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">Confirmar nova senha</span>
              <input
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                className="rounded-xl border border-[#cfe0df] bg-[#f8fcfc] px-3 py-2.5 outline-none focus:border-aqua focus:ring-2 focus:ring-aqua/20"
              />
            </label>
            {msg ? <p className="text-sm text-aqua-deep">{msg}</p> : null}
            <button
              type="submit"
              className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-aqua font-semibold text-white transition hover:bg-aqua-deep"
            >
              Salvar senha
            </button>
          </form>
        </PlaceholderCard>
      </div>
    </div>
  );
}
