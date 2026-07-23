import { useEffect, useMemo, useState } from 'react';
import PageHeader, { PlaceholderCard } from '../../components/PageHeader';
import { Field, TextInput, TextSelect, TextTextarea, Modal } from '../../components/forms/FormControls';
import { apiRequest } from '../../services/api';

function statusColor(status) {
  if (status === 'concluido') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'atrasado' || status === 'nao_realizado') return 'bg-red-100 text-red-800 border-red-200';
  if (status === 'cancelado') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-amber-100 text-amber-900 border-amber-200';
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
  const [view, setView] = useState('lista');

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

  const byDay = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      const day = String(e.data_hora_inicio).slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(e);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  return (
    <div>
      <PageHeader
        title="Agenda do Paciente"
        description="Consolida consultas, doses e cuidados com data/hora."
      />
      <PlaceholderCard>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Paciente">
            <TextSelect value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Todos</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
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
          <Field label="Visão">
            <TextSelect value={view} onChange={(e) => setView(e.target.value)}>
              <option value="lista">Lista</option>
              <option value="dia">Por dia</option>
            </TextSelect>
          </Field>
        </div>

        {view === 'lista' ? (
          <div className="grid gap-3">
            {events.map((e) => (
              <article key={e.id} className={`rounded-2xl border p-4 ${statusColor(e.status)}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase">{e.tipo}</p>
                    <h3 className="font-semibold">{e.titulo}</h3>
                    <p className="text-sm opacity-80">{e.paciente_nome}</p>
                  </div>
                  <span className="text-xs font-bold">
                    {e.data_hora_inicio ? new Date(e.data_hora_inicio).toLocaleString('pt-BR') : ''}
                  </span>
                </div>
              </article>
            ))}
            {!events.length ? <p className="text-sm text-slate-health">Nenhum evento na agenda.</p> : null}
          </div>
        ) : (
          <div className="grid gap-4">
            {byDay.map(([day, items]) => (
              <section key={day}>
                <h3 className="mb-2 font-display text-lg font-bold text-ink">
                  {new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </h3>
                <div className="grid gap-2">
                  {items.map((e) => (
                    <div key={e.id} className={`rounded-xl border px-3 py-3 ${statusColor(e.status)}`}>
                      <strong>{e.titulo}</strong>
                      <p className="text-xs">
                        {new Date(e.data_hora_inicio).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {e.status}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PlaceholderCard>
    </div>
  );
}

export function ConsultasPage() {
  const pacientes = usePacientes();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-4 min-h-12 rounded-xl bg-aqua px-5 font-semibold text-white"
        >
          Nova consulta
        </button>
        <div className="grid gap-3">
          {rows.map((r) => (
            <article key={r.id} className="rounded-2xl border border-[#d7e8e7] p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{r.especialidade} — {r.profissional_nome}</p>
                  <p className="text-sm text-slate-health">{r.paciente_nome}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusColor(r.status)}`}>
                  {r.status}
                </span>
              </div>
              <p className="mt-2 text-sm">
                {r.data_hora ? new Date(r.data_hora).toLocaleString('pt-BR') : ''} · {r.local_tipo}
              </p>
            </article>
          ))}
        </div>
      </PlaceholderCard>

      <Modal open={open} title="Nova consulta/sessão" onClose={() => setOpen(false)} wide>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
          <Field label="Paciente" required>
            <TextSelect value={form.paciente_id} onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}>
              <option value="">Selecione</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Profissional" required>
            <TextInput value={form.profissional_nome} onChange={(e) => setForm({ ...form, profissional_nome: e.target.value })} />
          </Field>
          <Field label="Especialidade" required>
            <TextInput value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} placeholder="Fisioterapia, Fono..." />
          </Field>
          <Field label="Local">
            <TextSelect value={form.local_tipo} onChange={(e) => setForm({ ...form, local_tipo: e.target.value })}>
              <option value="clinica">Clínica</option>
              <option value="hospital">Hospital</option>
              <option value="domiciliar">Domiciliar</option>
              <option value="outro">Outro</option>
            </TextSelect>
          </Field>
          <Field label="Data/Hora" required>
            <TextInput type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} />
          </Field>
          <Field label="Lembrete (min)">
            <TextInput type="number" value={form.lembrete_minutos} onChange={(e) => setForm({ ...form, lembrete_minutos: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observações">
              <TextTextarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </Field>
          </div>
          <button type="submit" className="min-h-12 rounded-xl bg-aqua font-semibold text-white sm:col-span-2">
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

  return (
    <div>
      <PageHeader
        title="Medicamentos e Atendimento"
        description="Rotina diária com checklist rápido para o cuidador."
      />
      <PlaceholderCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Filtrar paciente (checklist)">
            <TextSelect value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Todos</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </TextSelect>
          </Field>
          <button type="button" onClick={() => setOpen(true)} className="min-h-12 rounded-xl bg-aqua px-5 font-semibold text-white">
            Nova rotina
          </button>
        </div>

        <h3 className="mb-3 font-display text-lg font-bold">Checklist de hoje</h3>
        <div className="grid gap-3">
          {hoje.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#d7e8e7] bg-[#f8fcfc] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{item.titulo}</p>
                  <p className="text-sm text-slate-health">
                    {item.paciente_nome} ·{' '}
                    {new Date(item.data_hora_prevista).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              {item.status === 'pendente' || item.status === 'atrasado' ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="min-h-14 rounded-xl bg-emerald-600 text-base font-bold text-white"
                    onClick={() => confirmar(item.id, 'concluido')}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className="min-h-14 rounded-xl border border-red-300 text-base font-bold text-red-700"
                    onClick={() => {
                      const motivo = window.prompt('Motivo da não realização:');
                      if (motivo != null) confirmar(item.id, 'nao_realizado', motivo);
                    }}
                  >
                    Não realizado
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {!hoje.length ? <p className="text-sm text-slate-health">Nenhum atendimento previsto para hoje.</p> : null}
        </div>

        <h3 className="mb-3 mt-8 font-display text-lg font-bold">Rotinas programadas</h3>
        <div className="grid gap-2">
          {rotinas.map((r) => (
            <div key={r.id} className="rounded-xl border border-[#e2eeee] px-3 py-3 text-sm">
              <strong>{r.titulo}</strong> · {r.paciente_nome} · {String(r.horario).slice(0, 5)} · {r.tipo}
            </div>
          ))}
        </div>
      </PlaceholderCard>

      <Modal open={open} title="Nova rotina" onClose={() => setOpen(false)} wide>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
          <Field label="Paciente" required>
            <TextSelect value={form.paciente_id} onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}>
              <option value="">Selecione</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Tipo">
            <TextSelect value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="medicamento">Medicamento</option>
              <option value="pressao">Pressão</option>
              <option value="glicemia">Glicemia</option>
              <option value="banho">Banho</option>
              <option value="curativo">Curativo</option>
              <option value="outro">Outro</option>
            </TextSelect>
          </Field>
          <Field label="Título" required>
            <TextInput value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label="Horário" required>
            <TextInput type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
          </Field>
          <Field label="Início" required>
            <TextInput type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descrição">
              <TextTextarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </Field>
          </div>
          <button type="submit" className="min-h-12 rounded-xl bg-aqua font-semibold text-white sm:col-span-2">
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
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </TextSelect>
        </Field>

        <div className="relative mt-6 ml-3 border-l-2 border-[#b9dedb] pl-6">
          {events.map((e) => (
            <article key={e.id} className="relative mb-5">
              <span
                className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white ${
                  e.status === 'concluido'
                    ? 'bg-emerald-500'
                    : e.status === 'atrasado' || e.status === 'nao_realizado'
                      ? 'bg-red-500'
                      : 'bg-amber-400'
                }`}
              />
              <div className={`rounded-2xl border p-4 ${statusColor(e.status)}`}>
                <p className="text-xs font-bold uppercase">{e.tipo} · {e.status}</p>
                <h3 className="font-semibold">{e.titulo}</h3>
                <p className="text-xs opacity-80">
                  {e.data_hora_inicio ? new Date(e.data_hora_inicio).toLocaleString('pt-BR') : ''}
                </p>
              </div>
            </article>
          ))}
          {pacienteId && !events.length ? (
            <p className="text-sm text-slate-health">Sem eventos para este paciente.</p>
          ) : null}
        </div>
      </PlaceholderCard>
    </div>
  );
}
