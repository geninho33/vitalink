import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

const ACAO = {
  desvincular: 'Outro responsável continua acompanhando: só o seu acesso é removido; os dados do paciente ficam com a rede.',
  transferir: 'Só restam cuidadores: a gestão passa para o cuidador mais antigo e o seu acesso é removido.',
  excluir_paciente: 'O paciente e todos os dados de saúde dele serão excluídos.',
};

/** Pedido de exclusão de conta (LGPD art. 18, VI) com senha e carência. Usado em Meus dados e no bloqueio de consentimento. */
export default function ExclusaoConta({ compacto = false }) {
  const [info, setInfo] = useState(null);
  const [senha, setSenha] = useState('');
  const [confirmo, setConfirmo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await apiRequest('/lgpd/exclusao');
      setInfo(r.data);
    } catch (e) {
      setErr(e.message || 'Não foi possível carregar.');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function solicitar(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await apiRequest('/lgpd/exclusao', { method: 'POST', body: { senha, confirmo } });
      setSenha('');
      setConfirmo(false);
      setMsg('Pedido registrado. Você pode cancelar até a data indicada.');
      await load();
    } catch (e2) {
      setErr(e2.message || 'Não foi possível registrar o pedido.');
    } finally {
      setBusy(false);
    }
  }

  async function cancelar() {
    setBusy(true);
    setErr('');
    try {
      await apiRequest('/lgpd/exclusao', { method: 'DELETE' });
      setMsg('Pedido de exclusão cancelado. Sua conta continua ativa.');
      await load();
    } catch (e) {
      setErr(e.message || 'Não foi possível cancelar.');
    } finally {
      setBusy(false);
    }
  }

  if (!info) return err ? <p className="text-sm text-red-600">{err}</p> : null;
  const pedido = info.pedido;

  return (
    <div className="grid gap-3 text-sm">
      {msg ? <p className="font-semibold text-aqua-deep">✓ {msg}</p> : null}
      {err ? <p className="text-red-600">{err}</p> : null}
      {pedido ? (
        <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <p>
            <strong>Exclusão agendada</strong> para {new Date(pedido.efetivar_em).toLocaleString('pt-BR')}. Até lá sua
            conta funciona normalmente e você pode desistir.
          </p>
          <button type="button" onClick={cancelar} disabled={busy}
            className="h-11 justify-self-start rounded-xl bg-white px-4 font-semibold text-ink ring-1 ring-amber-300 disabled:opacity-50">
            Cancelar exclusão
          </button>
        </div>
      ) : (
        <form onSubmit={solicitar} className="grid gap-3">
          {!compacto ? (
            <p className="text-slate-health">
              Sua conta é anonimizada {info.carencia_dias} dias após o pedido (você pode cancelar antes). Exporte seus
              dados antes, se quiser guardar uma cópia.
            </p>
          ) : null}
          {info.plano?.length ? (
            <div className="grid gap-1">
              <p className="font-semibold text-ink">O que acontece com cada paciente:</p>
              <ul className="grid gap-1">
                {info.plano.map((p) => (
                  <li key={p.paciente_id} className="rounded-lg bg-[#f4f9f9] px-2 py-1">
                    <strong>{p.paciente_nome}</strong>: {ACAO[p.acao]}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-slate-health">
            Ficam guardados só o registro dos aceites e a trilha de auditoria, sem dados de saúde (obrigação legal).
          </p>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} />
            <span>Entendi que, após o prazo, a exclusão não pode ser desfeita.</span>
          </label>
          <input type="password" autoComplete="current-password" placeholder="Digite sua senha para confirmar" value={senha}
            onChange={(e) => setSenha(e.target.value)} className="h-11 rounded-xl border border-[#cfe0df] px-3" />
          <button type="submit" disabled={busy || !confirmo || !senha}
            className="h-11 justify-self-start rounded-xl bg-red-600 px-4 font-semibold text-white disabled:opacity-50">
            Pedir exclusão da conta
          </button>
        </form>
      )}
    </div>
  );
}
