import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateBr, storageGet } from '../localStore';
import { EmptyState, PageTitle, Panel } from '../ui';

function timelineDateValue(value) {
  const date = String(value || '').slice(0, 10);
  return new Date(`${date}T12:00:00`).getTime() || 0;
}

export default function LinhaView() {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const events = useMemo(() => {
    const items = [];
    storageGet('health-events', []).forEach((item) => {
      items.push({
        id: `health-${item.id}`,
        source: 'health',
        date: item.date || item.createdAt,
        type: item.type || 'Evento de saúde',
        title: item.description,
        doctor: item.doctor,
        diagnosis: item.diagnosis,
        exams: item.exams,
        detail: 'Evento registrado no prontuário.',
      });
    });
    storageGet('appointments', []).forEach((item) => {
      items.push({
        id: `appointment-${item.id}`,
        source: 'appointment',
        date: item.date || item.createdAt,
        type: 'Agenda',
        title: item.title,
        time: item.time,
        detail: item.time ? `Horário: ${item.time}` : 'Horário a definir.',
      });
    });
    return items.sort((a, b) => timelineDateValue(a.date) - timelineDateValue(b.date));
  }, []);

  const visible = events.filter((item) => filter === 'all' || item.source === filter);
  const activeId = selectedId || visible[visible.length - 1]?.id;
  const active = visible.find((e) => e.id === activeId);

  return (
    <div>
      <PageTitle
        eyebrow="Histórico clínico"
        title="Linha do tempo"
        description="Eventos de saúde organizados cronologicamente, com seus detalhes e documentos."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-ink">Mostrar</span>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setSelectedId(null);
            }}
            className="min-h-11 rounded-xl border border-[#cfe0df] bg-[#f8fcfc] px-3 text-sm outline-none focus:border-aqua focus:ring-2 focus:ring-aqua/20"
          >
            <option value="all">Todos os eventos</option>
            <option value="health">Eventos de saúde</option>
            <option value="appointment">Agenda</option>
          </select>
        </label>
        <Link
          to="/inicio/eventos"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink hover:bg-[#f4fbfa]"
        >
          + Novo evento
        </Link>
      </div>

      {visible.length === 0 ? (
        <EmptyState>
          Nenhum evento encontrado. Cadastre um evento de saúde para iniciar a linha do tempo.
        </EmptyState>
      ) : (
        <>
          <div className="relative mb-5 space-y-4 border-l-2 border-[#b9dedb] pl-6">
            {visible.map((item) => {
              const selected = item.id === activeId;
              return (
                <article key={item.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`absolute -left-[2.05rem] top-1 grid h-6 w-6 place-items-center rounded-full border-[3px] border-white shadow ${
                      selected ? 'bg-aqua-deep' : 'bg-aqua'
                    }`}
                    aria-pressed={selected}
                    aria-label={`Abrir ${item.title}`}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? 'border-aqua bg-aqua-soft'
                        : 'border-[#e2eeee] bg-white hover:bg-[#f8fcfc]'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wide text-aqua">
                      {item.type}
                    </span>
                    <strong className="mt-1 block text-ink">{item.title}</strong>
                    <small className="text-slate-health">
                      {formatDateBr(item.date, item.time)}
                    </small>
                  </button>
                </article>
              );
            })}
          </div>

          {active ? (
            <Panel>
              <p className="text-xs font-bold uppercase tracking-wider text-aqua">{active.type}</p>
              <h2 className="font-display text-xl font-bold text-ink">{active.title}</h2>
              <p className="mt-1 text-sm text-slate-health">
                {formatDateBr(active.date, active.time)}
              </p>
              <dl className="mt-4 grid gap-2 text-sm">
                {active.doctor ? (
                  <div>
                    <dt className="text-slate-health">Médico(a)</dt>
                    <dd className="font-semibold text-ink">{active.doctor}</dd>
                  </div>
                ) : null}
                {active.diagnosis ? (
                  <div>
                    <dt className="text-slate-health">Diagnóstico</dt>
                    <dd className="font-semibold text-ink">{active.diagnosis}</dd>
                  </div>
                ) : null}
                {active.exams ? (
                  <div>
                    <dt className="text-slate-health">Exames e orientações</dt>
                    <dd className="font-semibold text-ink">{active.exams}</dd>
                  </div>
                ) : null}
                {!active.doctor && !active.diagnosis && !active.exams ? (
                  <p className="text-slate-health">{active.detail}</p>
                ) : null}
              </dl>
              <div className="mt-4">
                <Link
                  to="/inicio/eventos"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink hover:bg-[#f4fbfa]"
                >
                  Abrir prontuário
                </Link>
              </div>
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}
