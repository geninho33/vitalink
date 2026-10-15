import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TextSelect } from '../../../components/forms/FormControls';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest } from '../../../services/api';
import { EmptyState, PageTitle, Panel, SecondaryButton } from '../ui';

const TIPOS = [
  { id: 'pressao', label: 'Pressão', unidade: 'mmHg' },
  { id: 'glicemia', label: 'Glicemia', unidade: 'mg/dL' },
  { id: 'frequencia_cardiaca', label: 'Batimentos', unidade: 'bpm' },
  { id: 'temperatura', label: 'Temperatura', unidade: '°C', decimal: true },
  { id: 'saturacao_o2', label: 'Saturação', unidade: '%' },
  { id: 'peso', label: 'Peso', unidade: 'kg', decimal: true },
];
const BY_ID = Object.fromEntries(TIPOS.map((t) => [t.id, t]));
const LAST_TIPO_KEY = 'vitalink:sinais:ultimoTipo';

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function lerUltimoTipo() {
  try {
    const t = window.localStorage.getItem(LAST_TIPO_KEY);
    return BY_ID[t] ? t : 'pressao';
  } catch {
    return 'pressao';
  }
}

function formatNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR') : String(v ?? '');
}

function formatValor(r) {
  if (!r) return '—';
  if (r.tipo === 'pressao') return `${r.sistolica}/${r.diastolica}`;
  return formatNum(r.valor);
}

function quando(iso) {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia
    ? `hoje ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const inputCls =
  'h-16 w-full rounded-2xl border-2 border-[#cfe0df] bg-white px-4 text-center text-3xl font-bold text-ink focus:border-aqua focus:outline-none';

export default function SinaisView() {
  const { pacienteId, paciente } = usePacienteAtivo();
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [tipo, setTipo] = useState(() => (BY_ID[params.get('tipo')] ? params.get('tipo') : lerUltimoTipo()));
  const [valor, setValor] = useState('');
  const [sis, setSis] = useState('');
  const [dia, setDia] = useState('');
  const [medidoEm, setMedidoEm] = useState(nowLocal());
  const [mudarHora, setMudarHora] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const firstRef = useRef(null);
  const diaRef = useRef(null);

  const load = useCallback(async () => {
    if (!pacienteId) {
      setRows([]);
      return;
    }
    try {
      const res = await apiRequest('/inicio/sinais-vitais', {
        query: { paciente_id: pacienteId, limit: 200 },
      });
      setRows(res.data || []);
    } catch {
      setRows([]);
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
  }, [load]);

  // Último valor de cada tipo (lista já vem ordenada do mais recente).
  const ultimos = useMemo(() => {
    const m = {};
    for (const r of rows) if (!m[r.tipo]) m[r.tipo] = r;
    return m;
  }, [rows]);

  const historico = useMemo(
    () => (filtro ? rows.filter((r) => r.tipo === filtro) : rows).slice(0, 50),
    [rows, filtro]
  );

  function escolher(t) {
    setTipo(t);
    setValor('');
    setSis('');
    setDia('');
    setError('');
    setOk('');
    try {
      window.localStorage.setItem(LAST_TIPO_KEY, t);
    } catch {
      /* ignore */
    }
    setTimeout(() => firstRef.current?.focus(), 0);
  }

  function repetirUltimo() {
    const u = ultimos[tipo];
    if (!u) return;
    if (tipo === 'pressao') {
      setSis(String(u.sistolica));
      setDia(String(u.diastolica));
    } else {
      setValor(formatNum(u.valor).replace(/\./g, ''));
    }
    setOk('');
  }

  async function salvar(e) {
    e.preventDefault();
    if (!pacienteId || saving) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      await apiRequest('/inicio/sinais-vitais', {
        method: 'POST',
        body: {
          paciente_id: Number(pacienteId),
          tipo,
          ...(tipo === 'pressao' ? { sistolica: sis, diastolica: dia } : { valor }),
          medido_em: mudarHora && medidoEm ? new Date(medidoEm).toISOString() : undefined,
          observacao: observacao.trim() || undefined,
        },
      });
      try {
        window.localStorage.setItem(LAST_TIPO_KEY, tipo);
      } catch {
        /* ignore */
      }
      setOk(`${BY_ID[tipo].label} registrada.`);
      setValor('');
      setSis('');
      setDia('');
      setObservacao('');
      setMudarHora(false);
      setMedidoEm(nowLocal());
      await load();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function remover(id) {
    if (!window.confirm('Excluir este registro?')) return;
    try {
      await apiRequest(`/inicio/sinais-vitais/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message || 'Não foi possível excluir.');
    }
  }

  if (!pacienteId) {
    return (
      <div>
        <PageTitle eyebrow="Sinais vitais" title="Registrar sinal vital" />
        <EmptyState>Selecione um paciente para registrar sinais vitais.</EmptyState>
      </div>
    );
  }

  const atual = BY_ID[tipo];
  const ultimo = ultimos[tipo];
  const podeSalvar = tipo === 'pressao' ? sis && dia : valor;

  return (
    <div className="grid gap-4">
      <PageTitle
        eyebrow="Sinais vitais"
        title={`Registrar${paciente?.nome ? ` · ${paciente.nome}` : ''}`}
        description="Toque no tipo, digite o valor e salve. É só um registro: em caso de sintomas, procure atendimento ou ligue 192."
      />

      {/* Cards: último valor por tipo; tocar seleciona o tipo */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {TIPOS.map((t) => {
          const u = ultimos[t.id];
          const ativo = t.id === tipo;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => escolher(t.id)}
              aria-pressed={ativo}
              className={`flex min-h-[84px] flex-col items-start justify-between rounded-2xl border-2 p-2.5 text-left transition ${
                ativo ? 'border-aqua bg-aqua-soft' : 'border-[#d7e8e7] bg-white'
              }`}
            >
              <span className="text-xs font-bold text-ink">{t.label}</span>
              <span className="text-lg font-bold leading-tight text-aqua-deep">
                {u ? formatValor(u) : '—'}
                <span className="ml-1 text-[10px] font-semibold text-slate-health">{t.unidade}</span>
              </span>
              <span className="text-[10px] text-slate-health">{u ? quando(u.medido_em) : 'sem registro'}</span>
            </button>
          );
        })}
      </div>

      <Panel>
        <form onSubmit={salvar} className="grid gap-3">
          <p className="text-sm font-bold text-ink">
            {atual.label} <span className="font-medium text-slate-health">({atual.unidade})</span>
          </p>
          {tipo === 'pressao' ? (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input
                ref={firstRef}
                autoFocus
                aria-label="Sistólica (máxima)"
                placeholder="12x"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="next"
                maxLength={3}
                className={inputCls}
                value={sis}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                  setSis(v);
                  if (v.length === 3) diaRef.current?.focus();
                }}
              />
              <span className="text-3xl font-bold text-slate-health">/</span>
              <input
                ref={diaRef}
                aria-label="Diastólica (mínima)"
                placeholder="8x"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                maxLength={3}
                className={inputCls}
                value={dia}
                onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
              <span className="text-center text-[11px] text-slate-health">máxima</span>
              <span />
              <span className="text-center text-[11px] text-slate-health">mínima</span>
            </div>
          ) : (
            <input
              ref={firstRef}
              autoFocus
              aria-label={`${atual.label} (${atual.unidade})`}
              inputMode={atual.decimal ? 'decimal' : 'numeric'}
              enterKeyHint="done"
              className={inputCls}
              value={valor}
              onChange={(e) =>
                setValor(e.target.value.replace(atual.decimal ? /[^\d.,]/g : /\D/g, '').slice(0, 6))
              }
            />
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {ultimo ? (
              <button type="button" onClick={repetirUltimo} className="font-semibold text-vita hover:underline">
                Repetir último ({formatValor(ultimo)})
              </button>
            ) : null}
            {mudarHora ? (
              <input
                type="datetime-local"
                value={medidoEm}
                max={nowLocal()}
                onChange={(e) => setMedidoEm(e.target.value)}
                className="h-10 rounded-xl border border-[#cfe0df] px-2"
              />
            ) : (
              <button type="button" onClick={() => setMudarHora(true)} className="text-slate-health hover:underline">
                Agora · mudar horário
              </button>
            )}
          </div>
          <input
            placeholder="Observação (opcional)"
            maxLength={500}
            className="h-11 rounded-xl border border-[#cfe0df] px-3 text-sm"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {ok ? <p className="text-sm font-semibold text-aqua-deep">✓ {ok}</p> : null}
          <button
            type="submit"
            disabled={saving || !podeSalvar}
            className="h-14 w-full rounded-2xl bg-aqua text-lg font-bold text-white transition hover:bg-aqua-deep disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </Panel>

      <Panel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-health">Histórico</h2>
          <TextSelect value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-xs">
            <option value="">Todos os tipos</option>
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </TextSelect>
        </div>
        {historico.length ? (
          <ul className="divide-y divide-[#e2eeee]">
            {historico.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold text-ink">
                    {BY_ID[r.tipo]?.label || r.tipo}: {formatValor(r)} {r.unidade}
                  </p>
                  <p className="text-xs text-slate-health">
                    {new Date(r.medido_em).toLocaleString('pt-BR')}
                    {r.registrado_por_nome ? ` · por ${r.registrado_por_nome}` : ''}
                    {r.observacao ? ` · ${r.observacao}` : ''}
                  </p>
                </div>
                <SecondaryButton onClick={() => remover(r.id)}>Excluir</SecondaryButton>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Nenhuma medição registrada ainda.</EmptyState>
        )}
      </Panel>
    </div>
  );
}
