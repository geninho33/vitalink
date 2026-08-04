import { useEffect, useMemo, useState } from 'react';
import AgendaDocsLinks from '../../components/AgendaDocsLinks';
import PageHeader, { PlaceholderCard } from '../../components/PageHeader';
import MonthCalendar from '../../components/MonthCalendar';
import TimelineRail from '../../components/TimelineRail';
import { Field, TextInput, TextSelect, TextTextarea, Modal } from '../../components/forms/FormControls';
import { apiRequest } from '../../services/api';

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeekSunday(d) {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_CONSULTA_FORM = {
  paciente_id: '',
  medico_id: '',
  profissional_nome: '',
  especialidade: '',
  local_tipo: 'clinica',
  data_hora: '',
  status: 'pendente',
  lembrete_minutos: 60,
  observacoes: '',
};

function MedicoAutocomplete({ value, medicoId, onSelect, required }) {
  const [medicos, setMedicos] = useState([]);
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiRequest('/medicos', { query: { pageSize: 100, status: 'ativo' } })
      .then((r) => setMedicos(r.data || []))
      .catch(() => setMedicos([]));
  }, []);

  useEffect(() => {
    setQuery(value || '');
  }, [value, medicoId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return medicos.slice(0, 12);
    return medicos
      .filter(
        (m) =>
          String(m.nome || '').toLowerCase().includes(q) ||
          String(m.especialidade || '').toLowerCase().includes(q) ||
          String(m.crm || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [medicos, query]);

  return (
    <Field label="Profissional" required={required}>
      <div className="relative">
        <TextInput
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            onSelect({ medico_id: '', profissional_nome: e.target.value, especialidade: '' });
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar médico ativo…"
          autoComplete="off"
        />
        {open && filtered.length ? (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[#cfe0df] bg-white py-1 shadow-panel">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-aqua-soft/50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect({
                      medico_id: m.id,
                      profissional_nome: m.nome,
                      especialidade: m.especialidade || '',
                    });
                    setQuery(m.nome);
                    setOpen(false);
                  }}
                >
                  <span className="font-semibold text-ink">{m.nome}</span>
                  {m.especialidade ? (
                    <span className="text-slate-health"> · {m.especialidade}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}

function ConsultaFormFields({ form, setForm, pacientes }) {
  return (
    <>
      <Field label="Paciente" required>
        <TextSelect
          value={form.paciente_id}
          onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
        >
          <option value="">Selecione</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </TextSelect>
      </Field>
      <MedicoAutocomplete
        value={form.profissional_nome}
        medicoId={form.medico_id}
        required
        onSelect={({ medico_id, profissional_nome, especialidade }) =>
          setForm((f) => ({
            ...f,
            medico_id: medico_id || '',
            profissional_nome,
            especialidade: especialidade || f.especialidade,
          }))
        }
      />
      <Field label="Especialidade" required>
        <TextInput
          value={form.especialidade}
          onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
          placeholder="Fisioterapia, Fono..."
        />
      </Field>
      <Field label="Local">
        <TextSelect
          value={form.local_tipo}
          onChange={(e) => setForm({ ...form, local_tipo: e.target.value })}
        >
          <option value="clinica">Clínica</option>
          <option value="hospital">Hospital</option>
          <option value="domiciliar">Domiciliar</option>
          <option value="outro">Outro</option>
        </TextSelect>
      </Field>
      <Field label="Data/Hora" required>
        <TextInput
          type="datetime-local"
          value={form.data_hora}
          onChange={(e) => setForm({ ...form, data_hora: e.target.value })}
        />
      </Field>
      <Field label="Lembrete (min)">
        <TextInput
          type="number"
          value={form.lembrete_minutos}
          onChange={(e) => setForm({ ...form, lembrete_minutos: e.target.value })}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Observações">
          <TextTextarea
            rows={3}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
        </Field>
      </div>
    </>
  );
}

function statusColor(status) {
  if (status === 'concluido') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'atrasado' || status === 'nao_realizado') return 'bg-red-100 text-red-800 border-red-200';
  if (status === 'cancelado') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-amber-100 text-amber-900 border-amber-200';
}

function statusChip(status) {
  const base = 'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide';
  return `${base} ${statusColor(status)}`;
}

function usePacientes() {
  const [list, setList] = useState([]);
  useEffect(() => {
    apiRequest('/pacientes', { query: { pageSize: 100, status: 'ativo' } })
      .then((r) => setList(r.data || []))
      .catch(() => setList([]));
  }, []);
  return list;
}

export function AgendaPage() {
  const pacientes = usePacientes();
  const [events, setEvents] = useState([]);
  const [pacienteId, setPacienteId] = useState('');
  const [status, setStatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [view, setView] = useState('mensal');
  const [dayDate, setDayDate] = useState(() => dayKey());
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekSunday(new Date()));
  const [selectedEvent, setSelectedEvent] = useState(null);

  async function load() {
    const res = await apiRequest('/agenda', {
      query: {
        paciente_id: pacienteId || undefined,
        status: status || undefined,
        tipo: tipo || undefined,
      },
    });
    setEvents(res.data || []);
  }

  useEffect(() => {
    load().catch(() => setEvents([]));
  }, [pacienteId, status, tipo]);

  const dayEvents = useMemo(
    () => events.filter((e) => String(e.data_hora_inicio || '').startsWith(dayDate)),
    [events, dayDate]
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );

  function renderEventRow(e) {
    const time = e.data_hora_inicio
      ? new Date(e.data_hora_inicio).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
    const docs = Number(e.docs_count || 0);
    return (
      <button
        key={e.id}
        type="button"
        onClick={() => setSelectedEvent(e)}
        className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-[#e2eeee] bg-[#fbfefe] px-2 py-1.5 text-left text-sm transition hover:border-vita/40 hover:bg-vita-soft/30"
      >
        <span className="text-[11px] font-bold tabular-nums text-aqua-deep">{time}</span>
        <span className="min-w-0 flex-1 font-semibold text-ink">{e.titulo}</span>
        {e.paciente_nome ? (
          <span className="truncate text-[11px] text-slate-health">{e.paciente_nome}</span>
        ) : null}
        {docs > 0 ? (
          <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
            {docs} doc{docs > 1 ? 's' : ''}
          </span>
        ) : null}
        <span className={statusChip(e.status)}>{e.status}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] capitalize text-slate-health">
          {e.tipo}
        </span>
      </button>
    );
  }

  return (
    <div>
      <PageHeader
        title="Agenda do Paciente"
        description="Calendário mensal com consultas, doses e cuidados."
      />
      <PlaceholderCard>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Paciente">
            <TextSelect value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Todos</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Status">
            <TextSelect value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="concluido">Concluído</option>
              <option value="atrasado">Atrasado</option>
              <option value="cancelado">Cancelado</option>
            </TextSelect>
          </Field>
          <Field label="Tipo">
            <TextSelect value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="consulta">Consulta</option>
              <option value="medicamento">Medicamento</option>
              <option value="cuidado">Cuidado</option>
            </TextSelect>
          </Field>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ['diaria', 'Diária'],
            ['semanal', 'Semanal'],
            ['mensal', 'Mensal'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`min-h-9 rounded-xl px-4 text-sm font-semibold transition ${
                view === id
                  ? 'bg-aqua text-white'
                  : 'border border-[#d7e8e7] text-ink hover:bg-aqua-soft/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'mensal' ? <MonthCalendar events={events} /> : null}

        {view === 'diaria' ? (
          <div>
            <Field label="Dia">
              <TextInput
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
              />
            </Field>
            <div className="mt-3 grid gap-1.5">
              {dayEvents.map(renderEventRow)}
              {!dayEvents.length ? (
                <p className="py-4 text-center text-sm text-slate-health">
                  Nenhum evento neste dia.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {view === 'semanal' ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#d7e8e7] px-3 py-1.5 text-sm font-semibold text-ink hover:bg-aqua-soft/40"
                onClick={() => setWeekAnchor((w) => addDays(w, -7))}
              >
                ← Semana anterior
              </button>
              <p className="text-sm font-semibold text-ink">
                {weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                {' — '}
                {weekDays[6].toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <button
                type="button"
                className="rounded-lg border border-[#d7e8e7] px-3 py-1.5 text-sm font-semibold text-ink hover:bg-aqua-soft/40"
                onClick={() => setWeekAnchor((w) => addDays(w, 7))}
              >
                Próxima semana →
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
              {weekDays.map((d) => {
                const key = dayKey(d);
                const list = events.filter((e) =>
                  String(e.data_hora_inicio || '').startsWith(key)
                );
                const isToday = key === dayKey();
                return (
                  <div
                    key={key}
                    className={`min-h-[8rem] rounded-xl border p-2 ${
                      isToday ? 'border-aqua bg-aqua-soft/20' : 'border-[#e2eeee] bg-[#fbfefe]'
                    }`}
                  >
                    <p className="mb-2 text-center text-[11px] font-bold uppercase text-slate-health">
                      {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      <span className="block text-sm text-ink">{d.getDate()}</span>
                    </p>
                    <div className="grid gap-1">
                      {list.slice(0, 5).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setSelectedEvent(e)}
                          className="truncate rounded-md bg-white px-1.5 py-0.5 text-left text-[10px] font-medium text-ink shadow-sm hover:bg-vita-soft"
                          title={e.titulo}
                        >
                          {e.data_hora_inicio
                            ? new Date(e.data_hora_inicio).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}{' '}
                          {e.titulo}
                          {Number(e.docs_count) > 0 ? ` · ${e.docs_count} doc` : ''}
                        </button>
                      ))}
                      {list.length > 5 ? (
                        <p className="text-center text-[10px] text-slate-health">
                          +{list.length - 5}
                        </p>
                      ) : null}
                      {!list.length ? (
                        <p className="text-center text-[10px] text-slate-health">—</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </PlaceholderCard>

      <Modal
        open={Boolean(selectedEvent)}
        title={selectedEvent?.titulo || 'Detalhe'}
        onClose={() => setSelectedEvent(null)}
      >
        {selectedEvent ? (
          <>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-health">Tipo</dt>
                <dd className="font-semibold capitalize text-ink">{selectedEvent.tipo}</dd>
              </div>
              {selectedEvent.consulta_especialidade ? (
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-health">Especialidade</dt>
                  <dd className="font-semibold text-ink">
                    {selectedEvent.consulta_especialidade}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-bold uppercase text-slate-health">Quando</dt>
                <dd className="font-semibold text-ink">
                  {selectedEvent.data_hora_inicio
                    ? new Date(selectedEvent.data_hora_inicio).toLocaleString('pt-BR')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-health">Paciente</dt>
                <dd className="font-semibold text-ink">
                  {selectedEvent.paciente_nome || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-health">Status</dt>
                <dd className="font-semibold capitalize text-ink">
                  {selectedEvent.status || '—'}
                </dd>
              </div>
              {selectedEvent.observacoes ? (
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-health">Observações</dt>
                  <dd className="text-ink">{selectedEvent.observacoes}</dd>
                </div>
              ) : null}
            </dl>
            <AgendaDocsLinks event={selectedEvent} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}

export function ConsultasPage() {
  const pacientes = usePacientes();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_CONSULTA_FORM });

  async function load() {
    const res = await apiRequest('/consultas');
    setRows(res.data || []);
  }

  useEffect(() => {
    load().catch(() => setRows([]));
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_CONSULTA_FORM });
    setOpen(true);
  }

  function openEdit(r) {
    setEditingId(r.id);
    setForm({
      paciente_id: String(r.paciente_id || ''),
      medico_id: r.medico_id || '',
      profissional_nome: r.profissional_nome || '',
      especialidade: r.especialidade || '',
      local_tipo: r.local_tipo || 'clinica',
      data_hora: toDatetimeLocal(r.data_hora),
      status: r.status || 'pendente',
      lembrete_minutos: r.lembrete_minutos ?? 60,
      observacoes: r.observacoes || '',
    });
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    const body = {
      ...form,
      paciente_id: Number(form.paciente_id),
      medico_id: form.medico_id ? Number(form.medico_id) : null,
      lembrete_minutos: Number(form.lembrete_minutos) || 60,
    };
    if (editingId) {
      await apiRequest(`/consultas/${editingId}`, { method: 'PUT', body });
    } else {
      await apiRequest('/consultas', { method: 'POST', body });
    }
    setOpen(false);
    setEditingId(null);
    await load();
  }

  async function marcarConcluida(id) {
    await apiRequest(`/consultas/${id}`, { method: 'PUT', body: { status: 'concluido' } });
    await load();
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta consulta?')) return;
    await apiRequest(`/consultas/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div>
      <PageHeader title="Consultas e Sessões" description="Agendamento com profissionais de saúde." />
      <PlaceholderCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-health">
            {rows.length} agendamento{rows.length === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="min-h-10 rounded-xl bg-aqua px-4 text-sm font-semibold text-white"
          >
            Nova consulta
          </button>
        </div>

        <div className="grid gap-1.5">
          {rows.map((r) => {
            const time = r.data_hora
              ? new Date(r.data_hora).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—';
            return (
              <article
                key={r.id}
                className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-[#e2eeee] bg-[#fbfefe] px-2.5 py-2"
              >
                <span className="shrink-0 rounded-md bg-sky-100 px-1.5 py-0.5 text-[11px] font-bold text-sky-800">
                  {time}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {r.profissional_nome}
                  <span className="font-normal text-slate-health"> · {r.especialidade}</span>
                </span>
                <span className="truncate text-[11px] text-slate-health">{r.paciente_nome}</span>
                <span className={statusChip(r.status)}>{r.status}</span>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="rounded-md border border-[#d7e8e7] px-2 py-1 text-[11px] font-bold text-ink hover:bg-aqua-soft/50"
                  >
                    Editar
                  </button>
                  {r.status !== 'concluido' ? (
                    <button
                      type="button"
                      onClick={() => marcarConcluida(r.id)}
                      className="rounded-md border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
                    >
                      Concluído(a)
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => excluir(r.id)}
                    className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            );
          })}
          {!rows.length ? (
            <p className="py-4 text-center text-sm text-slate-health">Nenhuma consulta cadastrada.</p>
          ) : null}
        </div>
      </PlaceholderCard>

      <Modal
        open={open}
        title={editingId ? 'Editar consulta/sessão' : 'Nova consulta/sessão'}
        onClose={() => {
          setOpen(false);
          setEditingId(null);
        }}
        wide
      >
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
          <ConsultaFormFields form={form} setForm={setForm} pacientes={pacientes} />
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-aqua font-semibold text-white sm:col-span-2"
          >
            {editingId ? 'Salvar alterações' : 'Salvar e enviar à agenda'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

export function RotinaPage() {
  const pacientes = usePacientes();
  const [rotinas, setRotinas] = useState([]);
  const [hoje, setHoje] = useState([]);
  const [pacienteId, setPacienteId] = useState('');
  const [open, setOpen] = useState(false);
  const [editingRotinaId, setEditingRotinaId] = useState(null);
  const [form, setForm] = useState({
    paciente_id: '',
    tipo: 'pressao',
    horario: '08:00',
    data_inicio: new Date().toISOString().slice(0, 10),
    dias_semana: '1,2,3,4,5,6,7',
    descricao: '',
  });

  const emptyForm = () => ({
    paciente_id: '',
    tipo: 'pressao',
    horario: '08:00',
    data_inicio: new Date().toISOString().slice(0, 10),
    dias_semana: '1,2,3,4,5,6,7',
    descricao: '',
  });

  async function load() {
    const [r, e] = await Promise.all([
      apiRequest('/rotina'),
      apiRequest('/rotina/execucoes/hoje', { query: { paciente_id: pacienteId || undefined } }),
    ]);
    setRotinas(r.data || []);
    setHoje(e.data || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, [pacienteId]);

  function openCreate() {
    setEditingRotinaId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEditRotina(r) {
    setEditingRotinaId(r.id);
    setForm({
      paciente_id: String(r.paciente_id || ''),
      tipo: r.tipo || 'outro',
      horario: String(r.horario || '08:00').slice(0, 5),
      data_inicio: String(r.data_inicio || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      dias_semana: r.dias_semana || '1,2,3,4,5,6,7',
      descricao: r.descricao || '',
    });
    setOpen(true);
  }

  async function save(ev) {
    ev.preventDefault();
    const body = { ...form, paciente_id: Number(form.paciente_id) };
    if (editingRotinaId) {
      await apiRequest(`/rotina/${editingRotinaId}`, { method: 'PUT', body });
    } else {
      await apiRequest('/rotina', { method: 'POST', body });
    }
    setOpen(false);
    setEditingRotinaId(null);
    await load();
  }

  async function excluirRotina(id) {
    if (!window.confirm('Excluir este evento programado?')) return;
    await apiRequest(`/rotina/${id}`, { method: 'DELETE' });
    await load();
  }

  async function confirmar(id, status, motivo) {
    await apiRequest(`/rotina/execucoes/${id}/confirmar`, {
      method: 'POST',
      body: { status, motivo_nao_realizacao: motivo || null },
    });
    await load();
  }

  const pendentes = hoje.filter((i) => i.status === 'pendente' || i.status === 'atrasado').length;
  const concluidos = hoje.filter((i) => i.status === 'concluido').length;

  return (
    <div>
      <PageHeader
        title="Eventos"
        description="Registre e acompanhe cuidados diários, sinais vitais e rotinas do paciente."
      />
      <PlaceholderCard>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Filtrar paciente">
            <TextSelect value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Todos</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </TextSelect>
          </Field>
          <button
            type="button"
            onClick={openCreate}
            className="min-h-10 rounded-xl bg-aqua px-4 text-sm font-semibold text-white"
          >
            Novo Evento
          </button>
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-ink">Eventos de hoje</h3>
          <p className="text-[11px] font-semibold text-slate-health">
            {concluidos}/{hoje.length || 0} concluídos · {pendentes} pendente
            {pendentes === 1 ? '' : 's'}
          </p>
        </div>

        <div className="grid gap-1">
          {hoje.map((item) => {
            const done = item.status === 'concluido';
            const failed = item.status === 'nao_realizado';
            const actionable = item.status === 'pendente' || item.status === 'atrasado';
            const time = new Date(item.data_hora_prevista).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <article
                key={item.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                  done
                    ? 'border-emerald-100 bg-emerald-50/60'
                    : failed
                      ? 'border-red-100 bg-red-50/50'
                      : 'border-[#e2eeee] bg-[#fbfefe]'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-emerald-600"
                  checked={done}
                  disabled={!actionable && !done}
                  onChange={() => {
                    if (actionable) confirmar(item.id, 'concluido');
                  }}
                  aria-label={`Marcar ${item.titulo} como concluído`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className="text-[11px] font-bold tabular-nums text-aqua-deep">{time}</span>
                    <span
                      className={`truncate text-sm font-semibold ${
                        done ? 'text-slate-health line-through' : 'text-ink'
                      }`}
                    >
                      {item.titulo}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-health">{item.paciente_nome}</p>
                </div>
                <span className={statusChip(item.status)}>{item.status}</span>
                {actionable ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-red-200 px-1.5 py-0.5 text-[10px] font-bold text-red-700 hover:bg-red-50"
                    onClick={() => {
                      const motivo = window.prompt('Motivo da não realização:');
                      if (motivo != null) confirmar(item.id, 'nao_realizado', motivo);
                    }}
                  >
                    Não
                  </button>
                ) : null}
              </article>
            );
          })}
          {!hoje.length ? (
            <p className="py-3 text-center text-sm text-slate-health">
              Nenhum evento previsto para hoje.
            </p>
          ) : null}
        </div>

        <h3 className="mb-2 mt-5 text-sm font-bold text-ink">Rotinas programadas</h3>
        <div className="grid gap-1">
          {rotinas.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e8f1f0] px-2 py-1.5 text-xs"
            >
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
                {String(r.horario).slice(0, 5)}
              </span>
              <strong className="text-ink">{r.titulo}</strong>
              <span className="text-slate-health">{r.paciente_nome}</span>
              <span className="capitalize text-slate-health">{r.tipo}</span>
              <div className="ml-auto flex gap-1">
                <button
                  type="button"
                  onClick={() => openEditRotina(r)}
                  className="rounded-md border border-[#d7e8e7] px-2 py-0.5 text-[10px] font-bold text-ink hover:bg-aqua-soft/50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => excluirRotina(r.id)}
                  className="rounded-md border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700 hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </PlaceholderCard>

      <Modal
        open={open}
        title={editingRotinaId ? 'Editar evento' : 'Novo Evento'}
        onClose={() => {
          setOpen(false);
          setEditingRotinaId(null);
        }}
        wide
      >
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
          <Field label="Paciente" required>
            <TextSelect
              value={form.paciente_id}
              onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
              disabled={Boolean(editingRotinaId)}
            >
              <option value="">Selecione</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Tipo">
            <TextSelect
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="pressao">Pressão</option>
              <option value="glicemia">Glicemia</option>
              <option value="banho">Banho</option>
              <option value="curativo">Curativo</option>
              <option value="outro">Outro</option>
            </TextSelect>
          </Field>
          <Field label="Horário" required>
            <TextInput
              type="time"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
            />
          </Field>
          <Field label="Data" required>
            <TextInput
              type="date"
              value={form.data_inicio}
              onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descrição">
              <TextTextarea
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </Field>
          </div>
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-aqua font-semibold text-white sm:col-span-2"
          >
            Salvar Evento
          </button>
        </form>
      </Modal>
    </div>
  );
}

export function TimelinePage() {
  const pacientes = usePacientes();
  const [pacienteId, setPacienteId] = useState('');
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!pacienteId) {
      setEvents([]);
      return;
    }
    apiRequest(`/timeline/${pacienteId}`)
      .then((r) => setEvents(r.data || []))
      .catch(() => setEvents([]));
  }, [pacienteId]);

  const items = events.map((e) => ({
    id: e.id,
    title: e.titulo,
    category: e.tipo,
    status: e.status || 'pendente',
    subtitle: e.data_hora_inicio
      ? new Date(e.data_hora_inicio).toLocaleString('pt-BR')
      : '',
  }));

  return (
    <div>
      <PageHeader
        title="Linha do Tempo"
        description="Histórico contínuo do que foi agendado e realizado."
      />
      <PlaceholderCard>
        <Field label="Paciente">
          <TextSelect value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
            <option value="">Selecione</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </TextSelect>
        </Field>

        <div className="mt-6">
          {pacienteId ? (
            <TimelineRail
              items={items}
              orientation="horizontal"
              emptyMessage="Sem eventos para este paciente."
            />
          ) : (
            <p className="py-6 text-center text-sm text-slate-health">
              Selecione um paciente para ver a linha do tempo.
            </p>
          )}
        </div>
      </PlaceholderCard>
    </div>
  );
}
