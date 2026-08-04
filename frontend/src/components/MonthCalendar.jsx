import { useMemo, useState } from 'react';
import AgendaDocsLinks from './AgendaDocsLinks';
import Icon from './Icon';
import { Modal } from './forms/FormControls';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TIPO_STYLE = {
  consulta: 'bg-sky-500 text-white',
  exame: 'bg-indigo-500 text-white',
  medicamento: 'bg-emerald-500 text-white',
  cuidado: 'bg-teal-600 text-white',
  rotina: 'bg-emerald-600 text-white',
  default: 'bg-slate-500 text-white',
};

function tipoClass(tipo) {
  const key = String(tipo || '').toLowerCase();
  return TIPO_STYLE[key] || TIPO_STYLE.default;
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthGrid(cursor) {
  const first = startOfMonth(cursor);
  const startPad = first.getDay(); // 0=Dom
  const cells = [];
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startPad);

  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

function formatEventTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calendário mensal full-size (grid 7×6) com mini-pills e modal do dia.
 * events: [{ id, titulo, tipo, status, data_hora_inicio, paciente_nome, ... }]
 */
export default function MonthCalendar({ events = [], onSelectEvent }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [dayDrawer, setDayDrawer] = useState(null); // { key, date, items }
  const [detail, setDetail] = useState(null);

  const byDay = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      const key = String(e.data_hora_inicio || e.data_hora || '').slice(0, 10);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    for (const list of map.values()) {
      list.sort((a, b) =>
        String(a.data_hora_inicio || '').localeCompare(String(b.data_hora_inicio || ''))
      );
    }
    return map;
  }, [events]);

  const cells = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const todayKey = dayKey(new Date());
  const monthLabel = cursor.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  function openDay(date) {
    const key = dayKey(date);
    const items = byDay.get(key) || [];
    setDayDrawer({ key, date, items });
  }

  function openEvent(ev) {
    setDetail(ev);
    onSelectEvent?.(ev);
  }

  return (
    <div className="w-full">
      {/* Navegação */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          className="grid h-10 w-10 place-items-center rounded-xl border border-[#d7e8e7] text-ink transition hover:bg-aqua-soft"
          aria-label="Mês anterior"
        >
          <Icon name="chevron" className="h-4 w-4 rotate-90" />
        </button>
        <div className="text-center">
          <p className="font-display text-lg font-bold capitalize text-ink">{monthLabel}</p>
          <button
            type="button"
            className="text-xs font-semibold text-aqua hover:underline"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Ir para hoje
          </button>
        </div>
        <button
          type="button"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          className="grid h-10 w-10 place-items-center rounded-xl border border-[#d7e8e7] text-ink transition hover:bg-aqua-soft"
          aria-label="Próximo mês"
        >
          <Icon name="chevron" className="h-4 w-4 -rotate-90" />
        </button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-health"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid 7×6 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((date) => {
          const key = dayKey(date);
          const inMonth = date.getMonth() === cursor.getMonth();
          const items = byDay.get(key) || [];
          const visible = items.slice(0, 3);
          const extra = items.length - visible.length;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => openDay(date)}
              className={`flex min-h-[5.5rem] flex-col rounded-xl border p-1 text-left transition sm:min-h-[6.75rem] sm:p-1.5 ${
                inMonth
                  ? 'border-[#e2eeee] bg-white hover:border-aqua/40 hover:bg-[#f8fcfc]'
                  : 'border-transparent bg-[#f3f7f7]/50 text-slate-health/50'
              } ${isToday ? 'ring-2 ring-aqua/50' : ''}`}
            >
              <span
                className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isToday ? 'bg-aqua text-white' : inMonth ? 'text-ink' : ''
                }`}
              >
                {date.getDate()}
              </span>
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {visible.map((ev) => (
                  <span
                    key={ev.id}
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEvent(ev);
                    }}
                    className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold leading-tight sm:text-[10px] ${tipoClass(
                      ev.tipo
                    )}`}
                    title={ev.titulo}
                  >
                    {formatEventTime(ev.data_hora_inicio)} {ev.titulo}
                  </span>
                ))}
                {extra > 0 ? (
                  <span className="truncate rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-health sm:text-[10px]">
                    +{extra} atividade{extra > 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {[
          ['consulta', 'Consultas'],
          ['medicamento', 'Medicamentos'],
          ['cuidado', 'Cuidados'],
        ].map(([tipo, label]) => (
          <span key={tipo} className="inline-flex items-center gap-1.5 font-semibold text-slate-health">
            <span className={`h-2.5 w-2.5 rounded-sm ${tipoClass(tipo)}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Drawer do dia */}
      <Modal
        open={Boolean(dayDrawer)}
        title={
          dayDrawer
            ? dayDrawer.date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })
            : ''
        }
        onClose={() => setDayDrawer(null)}
      >
        {dayDrawer?.items?.length ? (
          <ul className="grid gap-2">
            {dayDrawer.items.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => {
                    openEvent(ev);
                    setDayDrawer(null);
                  }}
                  className="flex w-full items-start gap-2 rounded-xl border border-[#e2eeee] px-3 py-2 text-left transition hover:bg-aqua-soft/50"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${tipoClass(
                      ev.tipo
                    )}`}
                  >
                    {ev.tipo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{ev.titulo}</span>
                    <span className="block text-xs text-slate-health">
                      {formatEventTime(ev.data_hora_inicio)}
                      {ev.paciente_nome ? ` · ${ev.paciente_nome}` : ''}
                      {ev.status ? ` · ${ev.status}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-health">Nenhuma atividade neste dia.</p>
        )}
      </Modal>

      {/* Detalhe rápido + documentos */}
      <Modal
        open={Boolean(detail)}
        title={detail?.titulo || 'Detalhe'}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-health">Tipo</dt>
                <dd className="font-semibold capitalize text-ink">{detail.tipo}</dd>
              </div>
              {detail.consulta_especialidade ? (
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-health">Especialidade</dt>
                  <dd className="font-semibold text-ink">{detail.consulta_especialidade}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-bold uppercase text-slate-health">Quando</dt>
                <dd className="font-semibold text-ink">
                  {detail.data_hora_inicio
                    ? new Date(detail.data_hora_inicio).toLocaleString('pt-BR')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-health">Paciente</dt>
                <dd className="font-semibold text-ink">{detail.paciente_nome || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-health">Status</dt>
                <dd className="font-semibold capitalize text-ink">{detail.status || '—'}</dd>
              </div>
              {detail.observacoes ? (
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-health">Observações</dt>
                  <dd className="text-ink">{detail.observacoes}</dd>
                </div>
              ) : null}
            </dl>
            <AgendaDocsLinks event={detail} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}
