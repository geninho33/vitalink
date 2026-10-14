import { useCallback, useEffect, useState } from 'react';
import { Field, TextInput, TextSelect } from '../../../components/forms/FormControls';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest } from '../../../services/api';
import { EmptyState, PageTitle, Panel, PrimaryButton, SecondaryButton } from '../ui';

const TIPOS = [
  { id: 'pressao', label: 'Pressão arterial', unidade: 'mmHg' },
  { id: 'frequencia_cardiaca', label: 'Frequência cardíaca', unidade: 'bpm' },
  { id: 'glicemia', label: 'Glicemia', unidade: 'mg/dL' },
  { id: 'temperatura', label: 'Temperatura', unidade: '°C' },
  { id: 'saturacao_o2', label: 'Saturação O2', unidade: '%' },
  { id: 'peso', label: 'Peso', unidade: 'kg' },
];
const LABEL = Object.fromEntries(TIPOS.map((t) => [t.id, t.label]));

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function emptyForm(tipo = 'pressao') {
  return { tipo, valor: '', sistolica: '', diastolica: '', medido_em: nowLocal(), observacao: '' };
}

function formatValor(r) {
  if (r.tipo === 'pressao') return `${r.sistolica}/${r.diastolica} ${r.unidade}`;
  const v = Number(r.valor);
  return `${Number.isFinite(v) ? v.toLocaleString('pt-BR') : r.valor} ${r.unidade}`;
}

export default function SinaisView() {
  const { pacienteId, paciente } = usePacienteAtivo();
  const [rows, setRows] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    if (!pacienteId) {
      setRows([]);
      return;
    }
    try {
      const res = await apiRequest('/inicio/sinais-vitais', {
        query: { paciente_id: pacienteId, ...(filtro ? { tipo: filtro } : {}) },
      });
      setRows(res.data || []);
    } catch {
      setRows([]);
    }
  }, [pacienteId, filtro]);

  useEffect(() => {
    load();
  }, [load]);

  const tipoAtual = TIPOS.find((t) => t.id === form.tipo) || TIPOS[0];

  async function salvar(e) {
    e.preventDefault();
    if (!pacienteId) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      await apiRequest('/inicio/sinais-vitais', {
        method: 'POST',
        body: {
          paciente_id: Number(pacienteId),
          tipo: form.tipo,
          ...(form.tipo === 'pressao'
            ? { sistolica: form.sistolica, diastolica: form.diastolica }
            : { valor: form.valor }),
          medido_em: form.medido_em ? new Date(form.medido_em).toISOString() : undefined,
          observacao: form.observacao.trim() || undefined,
        },
      });
      setForm(emptyForm(form.tipo));
      setOk('Registro salvo.');
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
        <PageTitle eyebrow="Sinais vitais" title="Registro de sinais vitais" />
        <EmptyState>Selecione um paciente para registrar sinais vitais.</EmptyState>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PageTitle
        eyebrow="Sinais vitais"
        title={`Registro rápido${paciente?.nome ? ` · ${paciente.nome}` : ''}`}
        description="Anote as medições feitas em casa. É só um registro: em caso de sintomas, procure atendimento ou ligue 192."
      />

      <Panel>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={salvar}>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm({ ...emptyForm(t.id), medido_em: form.medido_em })}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  form.tipo === t.id
                    ? 'border-aqua bg-aqua text-white'
                    : 'border-[#d7e8e7] text-ink hover:bg-[#f4fbfa]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {form.tipo === 'pressao' ? (
            <>
              <Field label="Sistólica (mmHg)" required>
                <TextInput
                  inputMode="numeric"
                  required
                  value={form.sistolica}
                  onChange={(e) => setForm({ ...form, sistolica: e.target.value.replace(/\D/g, '') })}
                  placeholder="120"
                />
              </Field>
              <Field label="Diastólica (mmHg)" required>
                <TextInput
                  inputMode="numeric"
                  required
                  value={form.diastolica}
                  onChange={(e) => setForm({ ...form, diastolica: e.target.value.replace(/\D/g, '') })}
                  placeholder="80"
                />
              </Field>
            </>
          ) : (
            <Field label={`${tipoAtual.label} (${tipoAtual.unidade})`} required>
              <TextInput
                inputMode="decimal"
                required
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value.replace(/[^\d.,]/g, '') })}
              />
            </Field>
          )}
          <Field label="Data e hora da medição">
            <TextInput
              type="datetime-local"
              value={form.medido_em}
              max={nowLocal()}
              onChange={(e) => setForm({ ...form, medido_em: e.target.value })}
            />
          </Field>
          <Field label="Observação" hint="Opcional">
            <TextInput
              maxLength={500}
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            />
          </Field>
          {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}
          {ok ? <p className="text-sm text-aqua-deep sm:col-span-2">{ok}</p> : null}
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar medição'}
            </PrimaryButton>
          </div>
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
        {rows.length ? (
          <ul className="divide-y divide-[#e2eeee]">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold text-ink">
                    {LABEL[r.tipo] || r.tipo}: {formatValor(r)}
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
