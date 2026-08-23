import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { redefinirSenhaRequest } from '../services/api';
import { PASSWORD_HINT, validateStrongPassword } from '../utils/validation';

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const senhaMsg = validateStrongPassword(senha);
    if (senhaMsg) {
      setError(senhaMsg);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await redefinirSenhaRequest({ token, senha });
      setDone(res.message || 'Senha redefinida.');
    } catch (err) {
      setError(err.message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9F6] px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#d0e4ef] bg-[#F7F9F6] p-7 shadow-panel">
        <h1 className="font-display text-2xl font-bold text-ink">Nova senha</h1>
        {done ? (
          <div className="mt-6 grid gap-3">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              {done}
            </p>
            <Link to="/login" className="text-sm font-semibold text-vita hover:underline">
              Entrar
            </Link>
          </div>
        ) : (
          <form className="mt-6 grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">Nova senha</span>
              <input
                type="password"
                required
                minLength={8}
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <span className="text-xs text-slate-health">{PASSWORD_HINT}</span>
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading || !token}
              className="h-12 rounded-xl bg-vita font-semibold text-white disabled:opacity-70"
            >
              {loading ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
