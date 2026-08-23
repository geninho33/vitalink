import { useEffect, useMemo, useState } from 'react';
import MonthCalendar from '../../../components/MonthCalendar';
import { Field, Modal, TextInput, TextSelect, TextTextarea } from '../../../components/forms/FormControls';
import { apiRequest } from '../../../services/api';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { EmptyState, PageTitle, Panel, PrimaryButton } from '../ui';

const ATIVIDADES = [
  { value: 'medicamento', label: 'Tomar remédio', tipo: 'medicamento' },
  { value: 'consulta', label: 'Consulta médica', tipo: 'compromisso' },
  { value: 'pressao', label: 'Medir pressão', tipo: 'saude' },
  { value: 'glicemia', label: 'Controle de diabetes', tipo: 'saude' },
  { value: 'rotina', label: 'Outra rotina diária', tipo: 'outro' },
];

function dayKey(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function nowLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function PeriodList({ days, events }) {
  return (
    <div className="grid gap-3">
      {days.map((d) => {
        const key = dayKey(d);
        const items = events.filter((e) => String(e.data_hora_inicio || '').startsWith(key));
        return (
          <article key={key} className="rounded-2xl border border-[#d7e8e7] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-vita">
              {d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
            </p>
            {items.length === 0 ? (
              <p className="mt-2 text-sm text-slate-health">Sem atividades.</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {items.map((e) => (
                  <li key={e.id} className="rounded-xl bg-[#f4fbfa] px-3 py-2 text-sm">
                    <strong className="text-ink">{e.titulo}</strong>
                    <span className="mt-0.5 block text-xs text-slate-health">
                      {eventTime(e.data_hora_inicio)}
                      {e.tipo ? ` · ${e.tipo}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default function InicioAgendaView() {
  const { pacienteId, paciente } = usePacienteAtivo();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('semana');
  const [cursor, setCursor] = useState(() => new Date());
  const [form, setForm] = useState({
    atividade: 'medicamento',
    titulo: '',
    descricao: '',
    data_hora: nowLocal(),
  });

  const atividade = useMemo(
    () => ATIVIDADES.find((a) => a.value === form.atividade) || ATIVIDADES[0],
    [form.atividade]
  );

  const days = useMemo(() => {
    if (view === 'dia') return [cursor];
    const start = addDays(cursor, -cursor.getDay());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  async function load() {
    if (!pacienteId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest('/agenda', { query: { paciente_id: pacienteId } });
      setEvents(res.data || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [pacienteId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pacienteId) return;
    setSaving(true);
    try {
      const titulo = form.titulo.trim() || atividade.label;
      await apiRequest('/inicio', {
        method: 'POST',
        body: {
          titulo,
          descricao: form.descricao.trim() || titulo,
          tipo: atividade.tipo,
          paciente_id: Number(pacienteId),
          data_registro: form.data_hora,
          prioridade: 'media',
          status: 'ativo',
        },
      });
      setOpen(false);
      setForm({ atividade: 'medicamento', titulo: '', descricao: '', data_hora: nowLocal() });
      await load();
    } catch (err) {
      window.alert(err.message || 'Não foi possível lançar a atividade.');
    } finally {
      setSaving(false);
    }
  }

  if (!pacienteId) {
    return (
      <div>
        <PageTitle
          eyebrow="Agenda"
          title="Agenda do paciente"
          description="Selecione um paciente no cabeçalho para ver a agenda."
        />
        <EmptyState>Escolha o paciente no seletor do topo da página.</EmptyState>
      </div>
    );
  }

  return (
    <div className="relative pb-16">
      <PageTitle
        eyebrow="Agenda"
        title={`Agenda de ${paciente?.nome || 'paciente'}`}
        description="Visualize o dia, a semana ou o mês das rotinas do paciente ativo."
      />

      <Panel className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'dia', label: 'Dia' },
            { id: 'semana', label: 'Semana' },
            { id: 'mes', label: 'Mês' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setView(opt.id)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                view === opt.id ? 'bg-vita text-white' : 'border border-[#d7e8e7] text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {view !== 'mes' ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-xl border border-[#d7e8e7] px-3 py-2 text-sm"
              onClick={() => setCursor((d) => addDays(d, view === 'dia' ? -1 : -7))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#d7e8e7] px-3 py-2 text-sm"
              onClick={() => setCursor(new Date())}
            >
              Hoje
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#d7e8e7] px-3 py-2 text-sm"
              onClick={() => setCursor((d) => addDays(d, view === 'dia' ? 1 : 7))}
            >
              Próximo
            </button>
          </div>
        ) : null}
        <p className="text-sm text-slate-health">
          {loading ? 'Carregando...' : `${events.length} evento(s).`}
        </p>
      </Panel>

      {view === 'mes' ? <MonthCalendar events={events} /> : <PeriodList days={days} events={events} />}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-vita text-2xl font-bold text-white shadow-panel sm:right-8"
        title="Nova atividade"
        aria-label="Nova atividade"
      >
        +
      </button>

      <Modal open={open} title="Nova atividade" onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <Field label="Categoria" required>
            <TextSelect
              value={form.atividade}
              onChange={(e) => setForm({ ...form, atividade: e.target.value })}
            >
              {ATIVIDADES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Título">
            <TextInput
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder={atividade.label}
            />
          </Field>
          <Field label="Data e hora" required>
            <TextInput
              type="datetime-local"
              required
              value={form.data_hora}
              onChange={(e) => setForm({ ...form, data_hora: e.target.value })}
            />
          </Field>
          <Field label="Observações">
            <TextTextarea
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex.: Pressão 12x8, glicemia 98 mg/dL..."
            />
          </Field>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Lançar na agenda'}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
