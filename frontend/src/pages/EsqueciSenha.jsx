import { useState } from 'react';
import { Link } from 'react-router-dom';
import { esqueciSenhaRequest } from '../services/api';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await esqueciSenhaRequest(email.trim());
      setDone(res);
    } catch (err) {
      setError(err.message || 'Não foi possível enviar as instruções.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9F6] px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#d0e4ef] bg-[#F7F9F6] p-7 shadow-panel">
        <h1 className="font-display text-2xl font-bold text-ink">Esqueceu a senha?</h1>
        <p className="mt-1 text-sm text-slate-health">
          Informe o e-mail cadastrado para receber o link de redefinição.
        </p>

        {done ? (
          <div className="mt-6 grid gap-3">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              {done.message}
            </p>
            {done.dev_link ? (
              <a href={done.dev_link} className="text-sm font-semibold text-vita underline">
                Abrir link de redefinição (dev)
              </a>
            ) : null}
            <Link to="/login" className="text-sm font-semibold text-vita hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form className="mt-6 grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">E-mail</span>
              <input
                type="email"
                required
                className="min-h-11 rounded-xl border border-[#cfe0df] px-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-xl bg-vita font-semibold text-white disabled:opacity-70"
            >
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </button>
            <Link to="/login" className="text-center text-sm text-slate-health hover:underline">
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
