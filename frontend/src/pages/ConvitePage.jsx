import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import ConsentGate from '../components/ConsentGate';
import { useAuth } from '../context/AuthContext';
import { usePacienteAtivo } from '../context/PacienteAtivoContext';
import { apiRequest } from '../services/api';

export const CONVITE_PENDENTE_KEY = 'vitalink-convite-pendente';

export function lerConvitePendente() {
  try {
    return sessionStorage.getItem(CONVITE_PENDENTE_KEY) || localStorage.getItem(CONVITE_PENDENTE_KEY) || '';
  } catch {
    return '';
  }
}

function guardarConvite(token) {
  try {
    if (token) localStorage.setItem(CONVITE_PENDENTE_KEY, token);
    else localStorage.removeItem(CONVITE_PENDENTE_KEY);
  } catch {
    /* ignore */
  }
}

function Aceitar({ token, previa }) {
  const { switchContext, refreshSession } = useAuth();
  const { setPacienteId, reload } = usePacienteAtivo();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function aceitar() {
    setBusy(true);
    setErr('');
    try {
      const r = await apiRequest(`/convites/publico/${encodeURIComponent(token)}/aceitar`, { method: 'POST' });
      guardarConvite('');
      const d = r.data || {};
      if (d.perfil_id && !d.ja_vinculado) {
        try {
          await switchContext({ perfil_id: d.perfil_id, paciente_id: d.paciente_id });
        } catch {
          await refreshSession().catch(() => {});
        }
      } else {
        await refreshSession().catch(() => {});
      }
      if (d.paciente_id) setPacienteId(d.paciente_id);
      await reload?.();
      navigate('/inicio', { replace: true });
    } catch (e) {
      setErr(e.message || 'Não foi possível aceitar o convite.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={aceitar}
        disabled={busy}
        className="h-12 rounded-xl bg-aqua font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Aceitando…' : `Aceitar e acompanhar ${previa.paciente_primeiro_nome}`}
      </button>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  );
}

export default function ConvitePage() {
  const { token } = useParams();
  const { isAuthenticated, sessionChecked, usuario, logout } = useAuth();
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    guardarConvite(token);
    apiRequest(`/convites/publico/${encodeURIComponent(token)}`, { skipAuthRedirect: true })
      .then((r) => setPrevia(r.data))
      .catch((e) => {
        guardarConvite('');
        setErro(e.message || 'Convite inválido.');
      });
  }, [token]);

  let corpo;
  if (erro) {
    corpo = (
      <>
        <p className="text-ink">{erro}</p>
        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="font-semibold text-aqua-deep underline">
          Ir para o VitaLink
        </Link>
      </>
    );
  } else if (!previa || !sessionChecked) {
    corpo = <p className="text-slate-health">Carregando convite…</p>;
  } else {
    corpo = (
      <>
        <p className="text-lg text-ink">
          <strong>{previa.convidado_por}</strong> convidou você para acompanhar os cuidados de{' '}
          <strong>{previa.paciente_primeiro_nome}</strong> como <strong>{previa.papel_rotulo.toLowerCase()}</strong>.
        </p>
        <p className="text-sm text-slate-health">
          {previa.papel === 'responsavel'
            ? 'Responsáveis veem e registram as informações de saúde do paciente e podem convidar outras pessoas.'
            : 'Cuidadores veem e registram as informações de saúde do paciente (remédios, sinais, rotina).'}{' '}
          O convite vale até {new Date(previa.expires_at).toLocaleDateString('pt-BR')} e só pode ser usado uma vez.
        </p>
        {isAuthenticated ? (
          <>
            <p className="text-sm text-slate-health">Você está entrando como {usuario?.nome || usuario?.email}.</p>
            <ConsentGate>
              <Aceitar token={token} previa={previa} />
            </ConsentGate>
            <button type="button" onClick={() => logout()} className="text-sm text-slate-health underline">
              Não é você? Entrar com outra conta
            </button>
          </>
        ) : (
          <div className="grid gap-2">
            <Link to="/login" className="flex h-12 items-center justify-center rounded-xl bg-aqua font-semibold text-white">
              Já tenho conta — Entrar
            </Link>
            <Link
              to="/registro"
              className="flex h-12 items-center justify-center rounded-xl border border-[#cfe0df] font-semibold text-ink"
            >
              Criar conta
            </Link>
            <p className="text-xs text-slate-health">Depois de entrar, você volta para esta tela para aceitar o convite.</p>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f9f9] p-4">
      <section className="grid w-full max-w-md gap-4 rounded-2xl bg-white p-6 shadow-sm">
        <BrandLogo />
        <h1 className="text-xl font-bold text-ink">Convite para a rede de cuidado</h1>
        {corpo}
      </section>
    </main>
  );
}
