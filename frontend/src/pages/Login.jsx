import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import {
  clearSavedCredentials,
  loadSavedCredentials,
  saveCredentials,
} from '../services/savedCredentials';

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
      <rect x="5" y="10" width="14" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [salvarCredenciais, setSalvarCredenciais] = useState(false);
  const [touched, setTouched] = useState({ email: false, senha: false });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const saved = loadSavedCredentials();
    if (!saved) return;
    setEmail(saved.email);
    setSenha(saved.senha);
    setSalvarCredenciais(true);
  }, []);

  const errors = useMemo(() => {
    const next = {};
    if (!email.trim()) next.email = 'Informe o e-mail.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'E-mail inválido.';
    if (!senha) next.senha = 'Informe a senha.';
    else if (senha.length < 6) next.senha = 'A senha deve ter ao menos 6 caracteres.';
    return next;
  }, [email, senha]);

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, senha: true });
    if (Object.keys(errors).length) return;
    setLoading(true);
    setAuthError('');
    try {
      const data = await login({ email: email.trim(), senha });
      if (salvarCredenciais) {
        saveCredentials({ email: email.trim(), senha });
      } else {
        clearSavedCredentials();
      }
      navigate(data?.usuario?.onboarding_concluido === false ? '/onboarding' : '/dashboard', {
        replace: true,
      });
    } catch (err) {
      setAuthError(err.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-gradient p-12 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,.4), transparent 35%), radial-gradient(circle at 80% 70%, rgba(72,202,228,.35), transparent 40%)',
          }}
        />
        <div className="relative z-10">
          <h1 className="max-w-lg font-display text-4xl font-bold leading-tight tracking-tight">
            Cuidado contínuo para quem você ama, onde ele estiver.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/90">
            Prontuário eletrônico com rotina de medicamentos, agenda e suporte
            integrado para pacientes, cuidadores e responsáveis.
          </p>
        </div>

        <div className="relative z-10 grid gap-4">
          <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-sm font-semibold">Acesso com perfil e permissões</p>
            <p className="mt-1 text-sm text-white/85">
              Menus dinâmicos para Administrador, Responsável, Cuidador e Paciente.
            </p>
          </article>
          <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-sm font-semibold">Proteção de dados sensíveis</p>
            <p className="mt-1 text-sm text-white/85">
              Trilha de auditoria sanitizada, alinhada à LGPD.
            </p>
          </article>
        </div>
      </section>

      <section className="flex items-center justify-center bg-[#F8F9FA] px-5 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-3xl border border-[#d0e4ef] bg-[#F7F9F6] p-7 shadow-panel sm:p-9">
          <div className="mb-6 flex flex-col items-center">
            <BrandLogo variant="full" />
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink">E-mail</span>
              <div
                className={`flex items-center gap-2 rounded-xl border bg-[#f8fcfc] px-3 transition ${
                  touched.email && errors.email
                    ? 'border-red-300 ring-2 ring-red-100'
                    : 'border-[#cfe0df] focus-within:border-vita focus-within:ring-2 focus-within:ring-vita/20'
                }`}
              >
                <IconMail className="h-5 w-5 shrink-0 text-vita" />
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="seu.email@empresa.com"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
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
                    : 'border-[#cfe0df] focus-within:border-vita focus-within:ring-2 focus-within:ring-vita/20'
                }`}
              >
                <IconLock className="h-5 w-5 shrink-0 text-vita" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, senha: true }))}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              {touched.senha && errors.senha ? (
                <span className="text-xs font-medium text-red-600">{errors.senha}</span>
              ) : null}
              <Link
                to="/esqueci-senha"
                className="justify-self-end text-xs font-semibold text-vita hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </label>

            <label className="flex items-start gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-vita"
                checked={salvarCredenciais}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSalvarCredenciais(checked);
                  if (!checked) clearSavedCredentials();
                }}
              />
              <span>
                Salvar credenciais de acesso neste dispositivo
                <span className="mt-0.5 block text-xs font-normal text-slate-health">
                  O e-mail e a senha ficam neste navegador para o próximo login.
                </span>
              </span>
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
              className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-vita font-semibold text-white transition hover:bg-vita-deep disabled:cursor-not-allowed disabled:opacity-70"
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

          <p className="mt-5 text-center text-sm text-slate-health">
            Novo por aqui?{' '}
            <Link to="/registro" className="font-semibold text-vita hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
