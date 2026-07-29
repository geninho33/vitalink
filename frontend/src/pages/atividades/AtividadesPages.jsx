import { useEffect, useState } from 'react';
import PageHeader, { PlaceholderCard } from '../../components/PageHeader';
import MonthCalendar from '../../components/MonthCalendar';
import TimelineRail from '../../components/TimelineRail';
import { Field, TextInput, TextSelect, TextTextarea, Modal } from '../../components/forms/FormControls';
import { apiRequest } from '../../services/api';

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

        <MonthCalendar events={events} />
      </PlaceholderCard>
    </div>
  );
}

export function ConsultasPage() {
  const pacientes = usePacientes();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    paciente_id: '',
    profissional_nome: '',
    especialidade: '',
    local_tipo: 'clinica',
    data_hora: '',
    status: 'pendente',
    lembrete_minutos: 60,
    observacoes: '',
  });

  async function load() {
    const res = await apiRequest('/consultas');
    setRows(res.data || []);
  }

  useEffect(() => {
    load().catch(() => setRows([]));
  }, []);

  async function save(e) {
    e.preventDefault();
    await apiRequest('/consultas', {
      method: 'POST',
      body: {
        ...form,
        paciente_id: Number(form.paciente_id),
        lembrete_minutos: Number(form.lembrete_minutos) || 60,
      },
    });
    setOpen(false);
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
            onClick={() => setOpen(true)}
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
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r)}
                className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-[#e2eeee] bg-[#fbfefe] px-2.5 py-2 text-left transition hover:border-aqua/40 hover:bg-aqua-soft/40"
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
              </button>
            );
          })}
          {!rows.length ? (
            <p className="py-4 text-center text-sm text-slate-health">Nenhuma consulta cadastrada.</p>
          ) : null}
        </div>
      </PlaceholderCard>

      <Modal open={Boolean(selected)} title="Detalhe da consulta" onClose={() => setSelected(null)}>
        {selected ? (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase text-slate-health">Profissional</dt>
              <dd className="font-semibold">{selected.profissional_nome}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-health">Especialidade</dt>
              <dd className="font-semibold">{selected.especialidade}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-health">Paciente</dt>
              <dd className="font-semibold">{selected.paciente_nome}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-health">Quando</dt>
              <dd className="font-semibold">
                {selected.data_hora
                  ? new Date(selected.data_hora).toLocaleString('pt-BR')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-health">Local / Status</dt>
              <dd className="font-semibold capitalize">
                {selected.local_tipo} · {selected.status}
              </dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <Modal open={open} title="Nova consulta/sessão" onClose={() => setOpen(false)} wide>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
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
          <Field label="Profissional" required>
            <TextInput
              value={form.profissional_nome}
              onChange={(e) => setForm({ ...form, profissional_nome: e.target.value })}
            />
          </Field>
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
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-aqua font-semibold text-white sm:col-span-2"
          >
            Salvar e enviar à agenda
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
  const [form, setForm] = useState({
    paciente_id: '',
    tipo: 'medicamento',
    titulo: '',
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

  async function save(ev) {
    ev.preventDefault();
    await apiRequest('/rotina', {
      method: 'POST',
      body: { ...form, paciente_id: Number(form.paciente_id) },
    });
    setOpen(false);
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
        title="Medicamentos e Atendimento"
        description="Checklist denso para o cuidador marcar doses e cuidados."
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
            onClick={() => setOpen(true)}
            className="min-h-10 rounded-xl bg-aqua px-4 text-sm font-semibold text-white"
          >
            Nova rotina
          </button>
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-ink">Checklist de hoje</h3>
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
              Nenhum atendimento previsto para hoje.
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
              <span className="ml-auto capitalize text-slate-health">{r.tipo}</span>
            </div>
          ))}
        </div>
      </PlaceholderCard>

      <Modal open={open} title="Nova rotina" onClose={() => setOpen(false)} wide>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
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
          <Field label="Tipo">
            <TextSelect
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="medicamento">Medicamento</option>
              <option value="pressao">Pressão</option>
              <option value="glicemia">Glicemia</option>
              <option value="banho">Banho</option>
              <option value="curativo">Curativo</option>
              <option value="outro">Outro</option>
            </TextSelect>
          </Field>
          <Field label="Título" required>
            <TextInput
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </Field>
          <Field label="Horário" required>
            <TextInput
              type="time"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
            />
          </Field>
          <Field label="Início" required>
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
            Salvar rotina
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
            <TimelineRail items={items} emptyMessage="Sem eventos para este paciente." />
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
