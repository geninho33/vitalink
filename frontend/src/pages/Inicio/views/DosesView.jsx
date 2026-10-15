import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest } from '../../../services/api';
import { EmptyState, PageTitle, Panel } from '../ui';

const STATUS = {
  pendente: { label: 'Pendente', cls: 'bg-slate-100 text-ink' },
  tomada: { label: 'Tomada', cls: 'bg-mint-soft text-aqua-deep' },
  pulada: { label: 'Pulada', cls: 'bg-amber-50 text-amber-800' },
};

function hora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function dia(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function DoseItem({ d, onAcao, busy, destaque }) {
  const st = STATUS[d.status] || { label: d.status, cls: 'bg-slate-100' };
  return (
    <li className={`py-3 ${destaque ? 'rounded-xl bg-aqua-soft px-2' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">
            {hora(d.data_hora)} · {d.remedio_nome}
            {d.quantidade_administrar ? <span className="font-normal text-slate-health"> · {d.quantidade_administrar}</span> : null}
          </p>
          <p className="text-xs text-slate-health">
            {dia(d.data_hora)}
            {d.adiado_ate && d.status === 'pendente' ? ` · adiada até ${hora(d.adiado_ate)}` : ''}
            {d.confirmado_em ? ` · por ${d.confirmado_por_nome || 'alguém'} às ${hora(d.confirmado_em)}` : ''}
            {d.escalado_em && d.status === 'pendente' ? ' · família avisada' : ''}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
      </div>
      {d.status === 'pendente' ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button type="button" disabled={busy} onClick={() => onAcao(d.id, 'tomei')}
            className="h-11 rounded-xl bg-aqua font-semibold text-white disabled:opacity-50">Tomei</button>
          <button type="button" disabled={busy} onClick={() => onAcao(d.id, 'pular')}
            className="h-11 rounded-xl border border-[#d7e8e7] font-semibold text-ink disabled:opacity-50">Pular</button>
          <button type="button" disabled={busy} onClick={() => onAcao(d.id, 'adiar')}
            className="h-11 rounded-xl border border-[#d7e8e7] text-sm font-semibold text-ink disabled:opacity-50">Adiar 15 min</button>
        </div>
      ) : null}
    </li>
  );
}

function ConfigLembretes({ pacienteId }) {
  const [cfg, setCfg] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    apiRequest('/inicio/lembretes-config', { query: { paciente_id: pacienteId } })
      .then((r) => setCfg(r.data))
      .catch(() => setCfg(null));
  }, [pacienteId]);
  if (!cfg) return null;
  const chk = (k, label) => (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1" checked={Boolean(cfg[k])} onChange={(e) => setCfg({ ...cfg, [k]: e.target.checked })} />
      <span>{label}</span>
    </label>
  );
  async function salvar(e) {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      const r = await apiRequest('/inicio/lembretes-config', {
        method: 'PUT',
        body: { ...cfg, paciente_id: Number(pacienteId), janela_escalonamento_min: Number(cfg.janela_escalonamento_min) },
      });
      setCfg(r.data);
      setMsg('Configuração salva.');
    } catch (e2) {
      setErr(e2.message || 'Não foi possível salvar.');
    }
  }
  return (
    <form onSubmit={salvar} className="grid gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-health">Lembretes deste paciente</h2>
      {chk('ativo', 'Enviar lembretes no horário das doses')}
      <p className="mt-1 text-xs font-semibold text-ink">Quem recebe o lembrete:</p>
      {chk('notificar_paciente', 'O próprio paciente (se tiver acesso ao app)')}
      {chk('notificar_cuidadores', 'Cuidadores')}
      {chk('notificar_responsaveis', 'Responsáveis / família')}
      <p className="mt-1 text-xs font-semibold text-ink">Se ninguém confirmar:</p>
      {chk('escalar_responsaveis', 'Avisar os responsáveis / família')}
      <label className="flex items-center gap-2 text-sm">
        <span>Esperar</span>
        <input type="number" min={5} max={240} inputMode="numeric"
          className="h-10 w-20 rounded-xl border border-[#cfe0df] px-2 text-center"
          value={cfg.janela_escalonamento_min}
          onChange={(e) => setCfg({ ...cfg, janela_escalonamento_min: e.target.value })} />
        <span>minutos antes de avisar</span>
      </label>
      {chk('mostrar_nome_remedio', 'Mostrar o nome do remédio e do paciente na notificação (aparece na tela bloqueada)')}
      <p className="text-xs text-slate-health">
        As notificações só lembram e registram; o VitaLink não faz avaliação clínica. Para receber, ative as
        notificações em Meus dados em cada aparelho.
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm text-aqua-deep">{msg}</p> : null}
      <div>
        <button type="submit" className="h-11 rounded-xl bg-aqua px-5 font-semibold text-white">Salvar</button>
      </div>
    </form>
  );
}

export default function DosesView() {
  const { pacienteId, paciente } = usePacienteAtivo();
  const [params] = useSearchParams();
  const destaqueId = Number(params.get('dose')) || null;
  const [pendentes, setPendentes] = useState([]);
  const [hoje, setHoje] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!pacienteId) return;
    try {
      const [p, h] = await Promise.all([
        apiRequest('/inicio/doses', { query: { paciente_id: pacienteId, status: 'pendente' } }),
        apiRequest('/inicio/doses', { query: { paciente_id: pacienteId } }),
      ]);
      setPendentes(p.data || []);
      setHoje(h.data || []);
    } catch (e) {
      setErr(e.message || 'Não foi possível carregar as doses.');
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  async function onAcao(id, acao) {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await apiRequest(`/inicio/doses/${id}/${acao}`, { method: 'POST', body: acao === 'adiar' ? { minutos: 15 } : {} });
      setMsg(acao === 'tomei' ? 'Dose registrada como tomada.' : acao === 'pular' ? 'Dose registrada como pulada.' : 'Lembrete adiado 15 minutos.');
      await load();
    } catch (e) {
      setErr(e.message || 'Não foi possível registrar.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!pacienteId) {
    return <EmptyState>Selecione um paciente.</EmptyState>;
  }

  return (
    <div className="grid gap-4">
      <PageTitle
        eyebrow="Remédios"
        title={`Doses${paciente?.nome ? ` · ${paciente.nome}` : ''}`}
        description="Confirme as doses: Tomei, Pular ou Adiar. Em caso de dúvida sobre o tratamento, fale com o médico; em emergência, ligue 192."
      />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm font-semibold text-aqua-deep">✓ {msg}</p> : null}
      <Panel>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-health">Para confirmar agora</h2>
        {pendentes.length ? (
          <ul className="divide-y divide-[#e2eeee]">
            {pendentes.map((d) => (
              <DoseItem key={d.id} d={d} onAcao={onAcao} busy={busy} destaque={d.id === destaqueId} />
            ))}
          </ul>
        ) : (
          <EmptyState>Nenhuma dose pendente agora.</EmptyState>
        )}
      </Panel>
      <Panel>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-health">Últimas 24h e próximas 24h</h2>
        {hoje.length ? (
          <ul className="divide-y divide-[#e2eeee]">
            {hoje.map((d) => (
              <DoseItem key={d.id} d={d} onAcao={onAcao} busy={busy} destaque={d.id === destaqueId} />
            ))}
          </ul>
        ) : (
          <EmptyState>Sem doses programadas. Cadastre os remédios em Medicamentos.</EmptyState>
        )}
      </Panel>
      <Panel>
        <ConfigLembretes pacienteId={pacienteId} />
      </Panel>
    </div>
  );
}
