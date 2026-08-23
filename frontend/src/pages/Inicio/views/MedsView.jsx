import { useCallback, useEffect, useState } from 'react';
import { DateBrInput, Field, MoneyInput, Modal, TextInput, TextSelect } from '../../../components/forms/FormControls';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest } from '../../../services/api';
import { formatDateBr, formatMoneyBr } from '../../../utils/validation';
import { EmptyState, PageTitle, Panel, PrimaryButton, SecondaryButton } from '../ui';

const empty = () => ({
  periodo_horario: 'manha',
  hora_exata: '',
  nome_comercial: '',
  quantidade_administrar: '',
  quantidade_estoque: '',
  consumo_diario: '1',
  indicacao: '',
  farmacia_id: '',
  valor: null,
  intervalo_horas: '8',
});

const emptyCompra = () => ({
  quantidade: '',
  valor: null,
  data_compra: '',
  farmacia_id: '',
});

function fmtDate(value) {
  return formatDateBr(value) || '—';
}

export default function MedsView() {
  const { pacienteId, paciente } = usePacienteAtivo();
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [farmacias, setFarmacias] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [quickFarm, setQuickFarm] = useState(null);
  const [comprasOf, setComprasOf] = useState(null);
  const [compras, setCompras] = useState([]);
  const [compraForm, setCompraForm] = useState(emptyCompra);
  const [compraOpen, setCompraOpen] = useState(null);

  const loadFarmacias = useCallback(async () => {
    try {
      const res = await apiRequest('/inicio/farmacias');
      setFarmacias(res.data || []);
    } catch {
      setFarmacias([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!pacienteId) {
      setList([]);
      return;
    }
    const res = await apiRequest('/inicio/medicamentos', {
      query: { paciente_id: pacienteId },
    });
    setList(res.data || []);
  }, [pacienteId]);

  useEffect(() => {
    loadFarmacias();
  }, [loadFarmacias]);

  useEffect(() => {
    refresh().catch(() => setList([]));
  }, [refresh]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pacienteId) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest('/inicio/medicamentos', {
        method: 'POST',
        body: {
          ...form,
          paciente_id: Number(pacienteId),
          farmacia_id: Number(form.farmacia_id),
          quantidade_estoque: Number(form.quantidade_estoque),
          consumo_diario: Number(form.consumo_diario) || 1,
          intervalo_horas: Number(form.intervalo_horas) || null,
        },
      });
      setForm(empty());
      await refresh();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar o medicamento.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await apiRequest(`/inicio/medicamentos/${id}`, { method: 'DELETE' });
      setConfirmId(null);
      await refresh();
    } catch (err) {
      window.alert(err.message || 'Não foi possível excluir.');
    }
  }

  async function openHistorico(med) {
    setComprasOf(med);
    try {
      const res = await apiRequest(`/inicio/medicamentos/${med.id}/compras`);
      setCompras(res.data || []);
    } catch {
      setCompras([]);
    }
  }

  async function saveQuickFarm(e) {
    e.preventDefault();
    if (!quickFarm?.nome?.trim()) return;
    try {
      const created = await apiRequest('/inicio/farmacia-rapida', {
        method: 'POST',
        body: { nome_fantasia: quickFarm.nome.trim(), telefone_principal: quickFarm.telefone || '00000000000' },
      });
      await loadFarmacias();
      if (compraOpen) {
        setCompraForm((f) => ({ ...f, farmacia_id: created.id }));
      } else {
        setForm((f) => ({ ...f, farmacia_id: created.id }));
      }
      setQuickFarm(null);
    } catch (err) {
      window.alert(err.message || 'Não foi possível cadastrar a farmácia.');
    }
  }

  async function submitCompra(e) {
    e.preventDefault();
    if (!compraOpen) return;
    try {
      await apiRequest(`/inicio/medicamentos/${compraOpen.id}/compras`, {
        method: 'POST',
        body: {
          quantidade: Number(compraForm.quantidade),
          valor: compraForm.valor,
          data_compra: compraForm.data_compra,
          farmacia_id: compraForm.farmacia_id || compraOpen.farmacia_id,
        },
      });
      setCompraOpen(null);
      setCompraForm(emptyCompra());
      await refresh();
      if (comprasOf?.id === compraOpen.id) await openHistorico(compraOpen);
    } catch (err) {
      window.alert(err.message || 'Não foi possível registrar a compra.');
    }
  }

  const alertas = list.filter((m) => m.alerta_reposicao);

  return (
    <div>
      <PageTitle
        eyebrow="Rotina"
        title="Medicamentos"
        description={
          paciente
            ? `Cadastro, estoque e projeção na agenda de ${paciente.nome}.`
            : 'Selecione um paciente no topo para gerenciar os medicamentos.'
        }
      />

      {alertas.length ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Reposição em até 3 dias:</strong>{' '}
          {alertas.map((m) => `${m.nome_comercial} (acaba em ${fmtDate(m.data_fim_estoque)})`).join(' · ')}
          . Realize uma nova compra.
        </div>
      ) : null}

      <Panel className="mb-5">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="sm:col-span-2">
            <Field label="Nome do medicamento" required>
              <TextInput
                required
                value={form.nome_comercial}
                onChange={(e) => setForm({ ...form, nome_comercial: e.target.value })}
                placeholder="Nome do medicamento"
              />
            </Field>
          </div>
          <Field label="Farmácia" required>
            <div className="flex gap-2">
              <TextSelect
                required
                value={form.farmacia_id}
                onChange={(e) => setForm({ ...form, farmacia_id: e.target.value })}
              >
                <option value="">Selecione</option>
                {farmacias.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_fantasia}
                  </option>
                ))}
              </TextSelect>
              <SecondaryButton type="button" onClick={() => setQuickFarm({ nome: '', telefone: '' })}>
                Nova
              </SecondaryButton>
            </div>
          </Field>
          <Field label="Valor do medicamento" required>
            <MoneyInput
              required
              value={form.valor}
              onChange={(valor) => setForm({ ...form, valor })}
            />
          </Field>
          <Field label="Período">
            <TextSelect
              value={form.periodo_horario}
              onChange={(e) => setForm({ ...form, periodo_horario: e.target.value })}
            >
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="noite">Noite</option>
              <option value="personalizado">Horário personalizado</option>
            </TextSelect>
          </Field>
          {form.periodo_horario === 'personalizado' ? (
            <Field label="Hora inicial" required>
              <TextInput
                type="time"
                required
                value={form.hora_exata}
                onChange={(e) => setForm({ ...form, hora_exata: e.target.value })}
              />
            </Field>
          ) : null}
          <Field label="Intervalo entre doses" required>
            <TextSelect
              value={form.intervalo_horas}
              onChange={(e) => setForm({ ...form, intervalo_horas: e.target.value })}
            >
              <option value="4">De 4 em 4 horas</option>
              <option value="6">De 6 em 6 horas</option>
              <option value="8">De 8 em 8 horas</option>
              <option value="12">De 12 em 12 horas</option>
              <option value="24">Uma vez ao dia (24h)</option>
            </TextSelect>
          </Field>
          <Field label="Dosagem / quantidade por dose" required>
            <TextInput
              required
              value={form.quantidade_administrar}
              onChange={(e) => setForm({ ...form, quantidade_administrar: e.target.value })}
              placeholder="Ex.: 1 comprimido de 500 mg"
            />
          </Field>
          <Field label="Total de comprimidos / Total em mL" required>
            <TextInput
              type="number"
              min="0"
              required
              value={form.quantidade_estoque}
              onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })}
            />
          </Field>
          <Field label="Consumo por dia" required>
            <TextInput
              type="number"
              min="0.25"
              step="0.25"
              required
              value={form.consumo_diario}
              onChange={(e) => setForm({ ...form, consumo_diario: e.target.value })}
            />
          </Field>
          <Field label="Indicação">
            <TextInput
              value={form.indicacao}
              onChange={(e) => setForm({ ...form, indicacao: e.target.value })}
              placeholder="Ex.: Controle da pressão"
            />
          </Field>
          {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" className="w-full" disabled={saving || !pacienteId}>
              {saving ? 'Salvando...' : 'Adicionar medicamento'}
            </PrimaryButton>
          </div>
        </form>
      </Panel>

      {list.length === 0 ? (
        <EmptyState>Nenhum medicamento cadastrado para este paciente.</EmptyState>
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <article key={m.id} className="rounded-2xl border border-[#d7e8e7] bg-white p-4">
              <strong className="block text-lg text-ink">{m.nome_comercial}</strong>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="min-h-10 text-sm font-semibold text-aqua-deep"
                    onClick={() => {
                      setCompraOpen(m);
                      setCompraForm({
                        ...emptyCompra(),
                        farmacia_id: m.farmacia_id || '',
                        valor: m.valor != null ? Number(m.valor) : null,
                      });
                    }}
                  >
                    Registrar nova compra
                  </button>
                  <button
                    type="button"
                    className="min-h-10 text-sm font-semibold text-slate-health"
                    onClick={() => openHistorico(m)}
                  >
                    Histórico
                  </button>
                </div>
                {confirmId === m.id ? (
                  <div className="flex gap-2">
                    <button type="button" className="text-sm" onClick={() => setConfirmId(null)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-red-600"
                      onClick={() => remove(m.id)}
                    >
                      Confirmar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-sm font-semibold text-red-600"
                    onClick={() => setConfirmId(m.id)}
                  >
                    Excluir
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-health">
                {m.quantidade_administrar || '—'} · {formatMoneyBr(m.valor) || '—'} · {m.farmacia_nome || 'Sem farmácia'}
              </p>
              <p className="mt-1 text-xs text-slate-health">
                Total compr./mL {m.quantidade_estoque ?? '—'} · {m.consumo_diario} un./dia
                {m.intervalo_horas ? ` · a cada ${m.intervalo_horas}h` : ''} · acaba em {fmtDate(m.data_fim_estoque)}
              </p>
              {m.alerta_reposicao ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Alerta: compre até {fmtDate(m.data_alerta_reposicao)}.
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Modal open={Boolean(quickFarm)} title="Cadastrar farmácia" onClose={() => setQuickFarm(null)}>
        {quickFarm ? (
          <form className="grid gap-3" onSubmit={saveQuickFarm}>
            <Field label="Nome da farmácia" required>
              <TextInput
                required
                value={quickFarm.nome}
                onChange={(e) => setQuickFarm({ ...quickFarm, nome: e.target.value })}
              />
            </Field>
            <Field label="Telefone">
              <TextInput
                value={quickFarm.telefone}
                onChange={(e) => setQuickFarm({ ...quickFarm, telefone: e.target.value })}
              />
            </Field>
            <PrimaryButton type="submit">Salvar farmácia</PrimaryButton>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(compraOpen)}
        title={compraOpen ? `Nova compra · ${compraOpen.nome_comercial}` : 'Nova compra'}
        onClose={() => setCompraOpen(null)}
      >
        {compraOpen ? (
          <form className="grid gap-3" onSubmit={submitCompra}>
            <Field label="Data da compra" required>
              <DateBrInput
                required
                value={compraForm.data_compra}
                onChange={(data_compra) => setCompraForm({ ...compraForm, data_compra })}
              />
            </Field>
            <Field label="Quantidade" required>
              <TextInput
                type="number"
                min="1"
                required
                value={compraForm.quantidade}
                onChange={(e) => setCompraForm({ ...compraForm, quantidade: e.target.value })}
              />
            </Field>
            <Field label="Valor" required>
              <MoneyInput
                required
                value={compraForm.valor}
                onChange={(valor) => setCompraForm({ ...compraForm, valor })}
              />
            </Field>
            <Field label="Farmácia">
              <div className="flex gap-2">
                <TextSelect
                  value={compraForm.farmacia_id}
                  onChange={(e) => setCompraForm({ ...compraForm, farmacia_id: e.target.value })}
                >
                  <option value="">Mesma farmácia</option>
                  {farmacias.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome_fantasia}
                    </option>
                  ))}
                </TextSelect>
                <SecondaryButton type="button" onClick={() => setQuickFarm({ nome: '', telefone: '' })}>
                  Nova
                </SecondaryButton>
              </div>
            </Field>
            <PrimaryButton type="submit">Registrar e atualizar agenda</PrimaryButton>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(comprasOf)}
        title={comprasOf ? `Histórico · ${comprasOf.nome_comercial}` : 'Histórico'}
        onClose={() => setComprasOf(null)}
      >
        {compras.length === 0 ? (
          <p className="text-sm text-slate-health">Nenhuma compra registrada.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {compras.map((c) => (
              <li key={c.id} className="rounded-xl border border-[#e2eeee] px-3 py-2">
                <strong>{fmtDate(c.data_compra)}</strong> · {c.quantidade} un. · {formatMoneyBr(c.valor) || '—'}
                <span className="block text-xs text-slate-health">{c.farmacia_nome || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
