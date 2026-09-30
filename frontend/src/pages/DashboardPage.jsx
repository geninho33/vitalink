import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isPacienteOuAutocuidado } from '../utils/perfis';
import PageHeader, { PlaceholderCard } from '../components/PageHeader';
import { Modal } from '../components/forms/FormControls';
import { apiRequest } from '../services/api';

const MOTIVATIONAL = [
  'Cuidar é um ato diário — cada dose confirmada protege uma história.',
  'Pequenos checklists evitam grandes intercorrências.',
  'Hidratação, sono e medicação em dia: triângulo da estabilidade.',
  'Um lembrete a tempo vale mais que uma emergência.',
  'Acompanhar a agenda é acompanhar a pessoa.',
  'Prevenir é o melhor cuidado contínuo no lar.',
];

function greetingForHour(h) {
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

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

function isAgendaCompromisso(e) {
  return String(e?.tipo || '') !== 'medicamento';
}

function WeekHeatmap({ events, onDayClick }) {
  const today = new Date();
  const start = addDays(today, -today.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const counts = days.map((d) => {
    const key = dayKey(d);
    return {
      key,
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      day: d.getDate(),
      count: events.filter((e) => String(e.data_hora_inicio || '').startsWith(key)).length,
      isToday: key === dayKey(today),
    };
  });
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {counts.map((c) => {
        const intensity = c.count / max;
        return (
          <div key={c.key} className="text-center">
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-health">{c.label}</p>
            <button
              type="button"
              onClick={() => onDayClick?.(c.key)}
              className={`mx-auto flex h-12 w-full max-w-[3rem] flex-col items-center justify-center rounded-xl border transition hover:ring-2 hover:ring-aqua/30 ${
                c.isToday ? 'border-aqua ring-1 ring-aqua/40' : 'border-[#e2eeee]'
              }`}
              style={{
                backgroundColor: `rgba(13, 148, 136, ${0.08 + intensity * 0.55})`,
              }}
              title={`${c.count} compromisso(s) — clique para ver`}
            >
              <span className="text-sm font-bold text-ink">{c.day}</span>
              <span className="text-[10px] font-semibold text-aqua-deep">{c.count}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { usuario, menus } = useAuth();
  const selfCare = isPacienteOuAutocuidado(usuario);
  const firstName = usuario?.nome?.split(' ')[0] || 'bem-vindo';
  const [loading, setLoading] = useState(true);
  const [agenda, setAgenda] = useState([]);
  const [tipIndex, setTipIndex] = useState(0);
  const [heatmapDay, setHeatmapDay] = useState(null);

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % MOTIVATIONAL.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ag = await apiRequest('/agenda', { query: { pageSize: 500 } }).catch(() => null);
        if (cancelled) return;
        setAgenda((ag?.data || []).filter(isAgendaCompromisso));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [usuario?.id, usuario?.perfil?.id]);

  const hour = new Date().getHours();
  const greet = greetingForHour(hour);
  const perfilNome = usuario?.perfil?.nome || 'Usuário';
  const bannerTitle = loading ? 'Carregando…' : `${greet}, ${firstName}!`;

  const heatmapDayEvents = useMemo(() => {
    if (!heatmapDay) return [];
    return agenda.filter((e) => String(e.data_hora_inicio || '').startsWith(heatmapDay));
  }, [agenda, heatmapDay]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard operacional"
        description="Calendário da semana integrado à agenda de eventos e consultas."
      />

      <div className="overflow-hidden rounded-2xl border border-[#c5e4e1] bg-gradient-to-br from-[#e8f7f6] via-white to-[#f0f9ff] p-4 shadow-sm sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-aqua">Saudação</p>
        <p className="mt-1 font-display text-lg font-bold leading-snug text-ink sm:text-xl">
          {bannerTitle}
          {!loading ? (
            <span className="font-semibold text-aqua-deep"> · {perfilNome}</span>
          ) : null}
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#d7e8e7]/80 bg-white/70 px-3 py-2">
          <span className="mt-0.5 shrink-0 rounded-md bg-aqua/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-aqua-deep">
            Dica
          </span>
          <p className="text-sm text-slate-health transition-opacity duration-500">
            {MOTIVATIONAL[tipIndex]}
          </p>
        </div>
        <div className="mt-2 flex gap-1">
          {MOTIVATIONAL.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Dica ${i + 1}`}
              onClick={() => setTipIndex(i)}
              className={`h-1.5 flex-1 rounded-full transition ${
                i === tipIndex ? 'bg-aqua' : 'bg-[#d7e8e7]'
              }`}
            />
          ))}
        </div>
      </div>

      <PlaceholderCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">Calendário operacional da semana</h2>
          <Link
            to={selfCare ? '/inicio/agenda' : '/agenda'}
            className="text-xs font-semibold text-aqua hover:underline"
          >
            Abrir agenda
          </Link>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-health">Carregando compromissos…</p>
        ) : (
          <>
            <WeekHeatmap events={agenda} onDayClick={setHeatmapDay} />
            <p className="mt-3 text-[11px] text-slate-health">
              Clique em um dia para ver eventos e consultas. Medicamentos ministrados não entram neste calendário.
            </p>
          </>
        )}
      </PlaceholderCard>

      <Modal
        open={Boolean(heatmapDay)}
        title={
          heatmapDay
            ? `Compromissos em ${new Date(`${heatmapDay}T12:00:00`).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}`
            : 'Compromissos do dia'
        }
        onClose={() => setHeatmapDay(null)}
        wide
      >
        <ul className="grid gap-2">
          {heatmapDayEvents.map((e) => (
            <li
              key={e.id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                e.status === 'cancelado'
                  ? 'border-slate-200 bg-slate-50 text-slate-500 line-through'
                  : 'border-[#e8f1f0] bg-[#fbfefe]'
              }`}
            >
              <span className="text-[11px] font-bold text-aqua-deep">
                {e.data_hora_inicio
                  ? new Date(e.data_hora_inicio).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
              <span className="min-w-0 flex-1 font-semibold text-ink">{e.titulo}</span>
              <span className="text-[11px] capitalize text-slate-health">{e.tipo}</span>
              {e.paciente_nome ? (
                <span className="text-[11px] text-slate-health">{e.paciente_nome}</span>
              ) : null}
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  e.status === 'cancelado'
                    ? 'bg-slate-200 text-slate-700'
                    : e.status === 'concluido'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                }`}
              >
                {e.status === 'cancelado' ? 'Cancelada' : e.status}
              </span>
            </li>
          ))}
          {!heatmapDayEvents.length ? (
            <p className="py-4 text-center text-sm text-slate-health">Nenhum compromisso neste dia.</p>
          ) : null}
        </ul>
      </Modal>

      <div className="grid gap-3 border-t border-[#e2eeee] pt-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[#f4fafa] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-health">Sessão</p>
          <p className="text-sm font-semibold text-ink">{usuario?.perfil?.nome}</p>
          <p className="truncate text-xs text-slate-health">{usuario?.email}</p>
        </div>
        <div className="rounded-xl bg-[#f4fafa] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-health">Menus</p>
          <p className="text-sm font-semibold text-ink">{menus.length} liberados</p>
          <Link to="/inicio" className="text-xs font-semibold text-aqua hover:underline">
            Ir ao Início
          </Link>
        </div>
        <div className="rounded-xl bg-[#f4fafa] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-health">Auditoria</p>
          <p className="text-xs text-slate-health">Trilha com diff sanitizado</p>
          <Link to="/auditoria" className="text-xs font-semibold text-aqua hover:underline">
            Abrir trilha
          </Link>
        </div>
      </div>
    </div>
  );
}
