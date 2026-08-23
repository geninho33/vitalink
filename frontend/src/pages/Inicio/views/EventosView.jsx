import { useCallback, useEffect, useState } from 'react';
import { ComboCreate, DateBrInput, Field, Modal, TextInput, TextSelect, TextTextarea } from '../../../components/forms/FormControls';
import { addCatalogItem, loadCatalog, optionize } from '../catalog';
import { apiRequest } from '../../../services/api';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { todayKey } from '../localStore';
import { EmptyState, PageTitle, Panel, PrimaryButton, SecondaryButton } from '../ui';

const EVENT_TYPES = [
  'Monitoramento diário',
  'Consulta',
  'Emergência',
  'Internação',
  'Exame',
  'Procedimento',
  'Outro',
];

function emptyForm() {
  return {
    date: todayKey(),
    type: 'Monitoramento diário',
    description: '',
    doctor: '',
    diagnosis: '',
    exams: '',
  };
}

export default function EventosView() {
  const { pacienteId } = usePacienteAtivo();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [medicos, setMedicos] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState(loadCatalog('diagnosticos'));
  const [quick, setQuick] = useState(null);
  const [quickValue, setQuickValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/inicio', {
        query: {
          status: 'ativo',
          page: 1,
          pageSize: 50,
          paciente_id: pacienteId || undefined,
        },
      });
      setRows(res.data || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar eventos.');
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiRequest('/medicos', { query: { pageSize: 200, status: 'ativo' } })
      .then((res) => setMedicos(res.data || []))
      .catch(() => setMedicos([]));
  }, []);

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      date: row.data_registro
        ? new Date(row.data_registro).toISOString().slice(0, 10)
        : todayKey(),
      type: row.titulo?.includes('·')
        ? row.titulo.split('·')[0].trim()
        : EVENT_TYPES.includes(row.titulo)
          ? row.titulo
          : 'Monitoramento diário',
      description: row.descricao || '',
      doctor: '',
      diagnosis: '',
      exams: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const titulo = form.type;
      const parts = [
        form.description.trim(),
        form.doctor ? `Médico(a): ${form.doctor.trim()}` : '',
        form.diagnosis ? `Diagnóstico: ${form.diagnosis.trim()}` : '',
        form.exams ? `Exames/orientações: ${form.exams.trim()}` : '',
      ].filter(Boolean);
      const payload = {
        titulo,
        descricao: parts.join('\n'),
        tipo: 'saude',
        prioridade: 'media',
        status: 'ativo',
        data_registro: form.date ? new Date(`${form.date}T12:00:00`).toISOString() : undefined,
        paciente_id: pacienteId ? Number(pacienteId) : null,
      };
      if (editingId) {
        await apiRequest(`/inicio/${editingId}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest('/inicio', { method: 'POST', body: payload });
      }
      // Espelho local para Linha do tempo
      const local = JSON.parse(localStorage.getItem('vitalink-health-events') || '[]');
      const localItem = {
        id: editingId || Date.now(),
        createdAt: new Date().toISOString(),
        date: form.date,
        type: form.type,
        description: form.description.trim(),
        doctor: form.doctor.trim(),
        diagnosis: form.diagnosis.trim(),
        exams: form.exams.trim(),
        documents: [],
      };
      const nextLocal = editingId
        ? local.map((r) => (String(r.id) === String(editingId) ? { ...r, ...localItem } : r))
        : [...local, localItem];
      localStorage.setItem('vitalink-health-events', JSON.stringify(nextLocal));

      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await apiRequest(`/inicio/${id}`, { method: 'DELETE' });
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(err.message || 'Falha ao excluir.');
      setConfirmId(null);
    }
  }

  return (
    <div>
      <PageTitle
        eyebrow="Prontuário médico"
        title="Eventos de saúde"
        description="Registre monitoramentos diários, atendimentos, sintomas, diagnósticos e exames."
      />

      <Panel className="mb-5">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Data do evento" required>
            <DateBrInput
              required
              value={form.date}
              onChange={(date) => setForm({ ...form, date })}
            />
          </Field>
          <Field label="Tipo de evento">
            <TextSelect
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </TextSelect>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descrição do evento" required>
              <TextTextarea
                rows={3}
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex.: Pressão 12/8 às 8h; temperatura 36,5 °C."
              />
            </Field>
          </div>
          <ComboCreate
            label="Médico(a)"
            value={form.doctor}
            onChange={(doctor) => setForm({ ...form, doctor })}
            options={[...optionize(medicos, 'nome', 'nome'), ...loadCatalog('medicos-locais')]}
            placeholder="Selecione"
            onCreate={() => {
              setQuick('doctor');
              setQuickValue('');
            }}
          />
          <ComboCreate
            label="Diagnóstico"
            value={form.diagnosis}
            onChange={(diagnosis) => setForm({ ...form, diagnosis })}
            options={diagnosticos}
            placeholder="Selecione"
            onCreate={() => {
              setQuick('diagnosis');
              setQuickValue('');
            }}
          />
          <div className="sm:col-span-2">
            <Field label="Exames solicitados / orientações">
              <TextTextarea
                rows={2}
                value={form.exams}
                onChange={(e) => setForm({ ...form, exams: e.target.value })}
                placeholder="Ex.: Repetir a medição à noite e observar sintomas."
              />
            </Field>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            <PrimaryButton type="submit" disabled={saving} className="sm:flex-1">
              {saving
                ? 'Salvando...'
                : editingId
                  ? 'Salvar alterações'
                  : 'Adicionar ao prontuário'}
            </PrimaryButton>
            {editingId ? (
              <SecondaryButton type="button" onClick={cancelEdit}>
                Cancelar edição
              </SecondaryButton>
            ) : null}
          </div>
        </form>
      </Panel>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-aqua">Eventos registrados</p>
        <h2 className="font-display text-lg font-bold text-ink">Prontuário</h2>
      </div>

      {loading ? (
        <p className="text-sm text-slate-health">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState>Nenhum evento de saúde registrado.</EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-[#d7e8e7] bg-white p-4 sm:flex-row sm:items-start"
            >
              <div className="shrink-0 rounded-xl bg-aqua-soft px-3 py-2 text-center text-xs font-semibold text-aqua-deep">
                {row.data_registro
                  ? new Date(row.data_registro).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : '—'}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-ink">{row.titulo}</strong>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-health">{row.descricao}</p>
                {confirmId === row.id ? (
                  <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-red-50 p-3">
                    <p className="w-full text-sm text-red-700">Arquivar este evento?</p>
                    <SecondaryButton type="button" onClick={() => setConfirmId(null)}>
                      Cancelar
                    </SecondaryButton>
                    <button
                      type="button"
                      className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white"
                      onClick={() => handleDelete(row.id)}
                    >
                      Confirmar
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SecondaryButton type="button" onClick={() => startEdit(row)}>
                      Editar
                    </SecondaryButton>
                    <SecondaryButton type="button" onClick={() => setConfirmId(row.id)}>
                      Excluir
                    </SecondaryButton>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(quick)}
        title={quick === 'doctor' ? 'Novo médico' : 'Novo diagnóstico'}
        onClose={() => setQuick(null)}
      >
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const value = quickValue.trim();
            if (!value) return;
            if (quick === 'doctor') {
              addCatalogItem('medicos-locais', { value, label: value });
              setForm((f) => ({ ...f, doctor: value }));
            } else {
              setDiagnosticos(addCatalogItem('diagnosticos', { value, label: value }));
              setForm((f) => ({ ...f, diagnosis: value }));
            }
            setQuick(null);
          }}
        >
          <Field label="Nome" required>
            <TextInput required value={quickValue} onChange={(e) => setQuickValue(e.target.value)} />
          </Field>
          <PrimaryButton type="submit">Salvar e selecionar</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
