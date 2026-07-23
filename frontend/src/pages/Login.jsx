import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function IconMail({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v10.5A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25V6.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m5 7 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconShield({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 19 6.2v5.1c0 4.3-2.9 8.2-7 9.2-4.1-1-7-4.9-7-9.2V6.2L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m9.2 12.1 1.9 1.9 3.7-3.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [touched, setTouched] = useState({ email: false, senha: false });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const errors = useMemo(() => {
    const next = {};
    if (!email.trim()) next.email = 'Informe o e-mail.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'E-mail inválido.';
    if (!senha) next.senha = 'Informe a senha.';
    else if (senha.length < 6) next.senha = 'A senha deve ter ao menos 6 caracteres.';
    return next;
  }, [email, senha]);

  const isValid = Object.keys(errors).length === 0;

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({ email: true, senha: true });
    setAuthError('');
    if (!isValid) return;

    setLoading(true);
    try {
      await login({
        email: email.trim(),
        senha,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setAuthError(err.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-aqua-deep via-aqua to-[#2a9aa3] p-12 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 35%), radial-gradient(circle at 80% 70%, rgba(47,111,237,.35), transparent 40%)',
          }}
        />
        <div className="relative z-10">
          <p className="font-display text-sm font-bold tracking-[0.2em] uppercase text-mint-soft/90">
            VitaLink
          </p>
          <h1 className="mt-6 max-w-lg font-display text-4xl font-bold leading-tight tracking-tight">
            Cuidado contínuo para quem você ama, onde ele estiver.
          </h1>
          <p className="mt-4 max-w-md text-base text-white/85 leading-relaxed">
            Monitoramento diário de saúde, rotina de medicamentos e suporte
            integrado para pacientes, cuidadores e médicos.
          </p>
        </div>

        <div className="relative z-10 grid gap-4">
          <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-sm font-semibold">Acesso com perfil e permissões</p>
            <p className="mt-1 text-sm text-white/80">
              Menus dinâmicos adaptados para Médicos, Cuidadores, Pacientes e
              Administradores.
            </p>
          </article>
          <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-sm font-semibold">Proteção de dados sensíveis</p>
            <p className="mt-1 text-sm text-white/80">
              Trilha de auditoria sanitizada, sem gravação de logs com dados
              clínicos expostos.
            </p>
          </article>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-3xl border border-[#d7e8e7] bg-white/95 p-7 shadow-panel sm:p-9">
          <div className="mb-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-aqua-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-aqua-deep">
              <span className="inline-block h-2 w-2 rounded-full bg-mint" />
              Acesso seguro
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink">
              Entrar no Sistema
            </h2>
            <p className="mt-2 text-sm text-slate-health">
              Use suas credenciais corporativas VitaLink.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">E-mail</span>
              <div
                className={`flex items-center gap-2 rounded-xl border bg-[#f8fcfc] px-3 transition ${
                  touched.email && errors.email
                    ? 'border-red-300 ring-2 ring-red-100'
                    : 'border-[#cfe0df] focus-within:border-aqua focus-within:ring-2 focus-within:ring-aqua/20'
                }`}
              >
                <IconMail className="h-5 w-5 shrink-0 text-aqua" />
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="seu.email@empresa.com"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                  aria-invalid={touched.email && !!errors.email}
                />
              </div>
              {touched.email && errors.email ? (
                <span className="text-xs font-medium text-red-600">{errors.email}</span>
              ) : null}
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">Senha</span>
              <div
                className={`flex items-center gap-2 rounded-xl border bg-[#f8fcfc] px-3 transition ${
                  touched.senha && errors.senha
                    ? 'border-red-300 ring-2 ring-red-100'
                    : 'border-[#cfe0df] focus-within:border-aqua focus-within:ring-2 focus-within:ring-aqua/20'
                }`}
              >
                <IconLock className="h-5 w-5 shrink-0 text-aqua" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, senha: true }))}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                  aria-invalid={touched.senha && !!errors.senha}
                />
              </div>
              {touched.senha && errors.senha ? (
                <span className="text-xs font-medium text-red-600">{errors.senha}</span>
              ) : null}
            </label>

            {authError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {authError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-aqua font-semibold text-white transition hover:bg-aqua-deep disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Autenticando...
                </span>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          <aside className="mt-6 flex gap-3 rounded-2xl border border-[#d9ebea] bg-aqua-soft/70 p-3.5 text-sm text-[#38565b]">
            <IconShield className="mt-0.5 h-5 w-5 shrink-0 text-aqua-deep" />
            <p>
              <strong className="font-semibold text-ink">LGPD:</strong> este
              acesso é auditado. Não compartilhe credenciais e evite inserir
              dados clínicos em canais não autorizados.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
