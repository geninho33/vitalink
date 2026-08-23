import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
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

const TIPO_COLORS = {
  consulta: '#0ea5e9',
  medicamento: '#10b981',
  cuidado: '#0d9488',
  exame: '#6366f1',
  rotina: '#059669',
  outro: '#64748b',
};

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

function countdownLabel(iso) {
  const target = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((startTarget - startToday) / 86400000);
  const time = target.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Hoje às ${time}`;
  if (diffDays === 1) return `Amanhã às ${time}`;
  if (diffDays > 1 && diffDays < 7) return `Em ${diffDays} dias · ${time}`;
  return target.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function alertTag(iso, status) {
  if (status === 'atrasado') return { label: 'Urgente', className: 'bg-red-100 text-red-800' };
  const target = new Date(iso);
  const hours = (target - new Date()) / 3600000;
  if (hours < 24 && hours >= 0) return { label: 'Próximo', className: 'bg-amber-100 text-amber-900' };
  if (status === 'concluido') return { label: 'Confirmado', className: 'bg-emerald-100 text-emerald-800' };
  return { label: 'Confirmado', className: 'bg-sky-100 text-sky-800' };
}

function KpiCard({ label, value, hint, to, accent = 'aqua' }) {
  const accents = {
    aqua: 'text-aqua',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
  };
  return (
    <div className="rounded-2xl border border-[#d7e8e7] bg-white px-4 py-3 shadow-sm">
      <p className={`text-[10px] font-bold uppercase tracking-wider ${accents[accent] || accents.aqua}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-health">{hint}</p> : null}
      {to ? (
        <Link to={to} className="mt-1 inline-block text-xs font-semibold text-aqua hover:underline">
          Abrir
        </Link>
      ) : null}
    </div>
  );
}

function WeekHeatmap({ events, onDayClick }) {
  const today = new Date();
  const start = addDays(today, -today.getDay()); // domingo da semana
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
  const firstName = usuario?.nome?.split(' ')[0] || 'bem-vindo';
  const [loading, setLoading] = useState(true);
  const [agenda, setAgenda] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [hojeExec, setHojeExec] = useState([]);
  const [pacientesAtivos, setPacientesAtivos] = useState(0);
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
        const [pac, ag, cons, exec] = await Promise.all([
          apiRequest('/pacientes', { query: { status: 'ativo', pageSize: 1 } }).catch(() => null),
          apiRequest('/agenda', { query: { pageSize: 500 } }).catch(() => null),
          apiRequest('/consultas').catch(() => null),
          apiRequest('/rotina/execucoes/hoje').catch(() => null),
        ]);
        if (cancelled) return;
        setPacientesAtivos(pac?.pagination?.total ?? (pac?.data || []).length);
        setAgenda(ag?.data || []);
        setConsultas(cons?.data || []);
        setHojeExec(exec?.data || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [usuario?.id, usuario?.perfil?.id]);

  const metrics = useMemo(() => {
    const today = dayKey();
    const in7 = dayKey(addDays(new Date(), 7));
    const in30ago = dayKey(addDays(new Date(), -30));
    const in7ago = dayKey(addDays(new Date(), -7));

    const eventosHoje = agenda.filter((e) =>
      String(e.data_hora_inicio || '').startsWith(today)
    );
    const concluidosHoje = eventosHoje.filter((e) => e.status === 'concluido').length;
    const pendentesHoje = eventosHoje.filter(
      (e) => e.status === 'pendente' || e.status === 'atrasado'
    ).length;

    const consultasSemana = consultas.filter((c) => {
      const d = String(c.data_hora || '').slice(0, 10);
      return d >= today && d <= in7;
    });

    const proximos = [...agenda]
      .filter((e) => {
        const d = String(e.data_hora_inicio || '').slice(0, 10);
        return d >= today && d <= in7 && e.status !== 'cancelado';
      })
      .sort((a, b) =>
        String(a.data_hora_inicio).localeCompare(String(b.data_hora_inicio))
      )
      .slice(0, 8);

    const alertas = agenda.filter(
      (e) =>
        e.status === 'atrasado' ||
        (e.status === 'pendente' && String(e.data_hora_inicio || '').startsWith(today))
    ).length;

    // Aderência 7d / 30d
    function aderencia(fromKey) {
      const slice = agenda.filter((e) => {
        const d = String(e.data_hora_inicio || '').slice(0, 10);
        return d >= fromKey && d <= today;
      });
      const done = slice.filter((e) => e.status === 'concluido').length;
      const pending = slice.filter(
        (e) => e.status === 'pendente' || e.status === 'atrasado' || e.status === 'nao_realizado'
      ).length;
      const total = done + pending || 1;
      return {
        done,
        pending,
        pct: Math.round((done / total) * 100),
        data: [
          { name: 'Concluídos', value: done, color: '#10b981' },
          { name: 'Pendentes', value: pending, color: '#f59e0b' },
        ],
      };
    }

    const ad7 = aderencia(in7ago);
    const ad30 = aderencia(in30ago);

    // Volume por categoria (últimos 30 dias)
    const cats = {};
    agenda
      .filter((e) => String(e.data_hora_inicio || '').slice(0, 10) >= in30ago)
      .forEach((e) => {
        const t = e.tipo || 'outro';
        cats[t] = (cats[t] || 0) + 1;
      });
    const volume = Object.entries(cats).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: TIPO_COLORS[name] || TIPO_COLORS.outro,
    }));

    const medsEmDia =
      hojeExec.length === 0
        ? 100
        : Math.round(
            (hojeExec.filter((i) => i.status === 'concluido').length / hojeExec.length) * 100
          );

    return {
      eventosHoje: eventosHoje.length,
      concluidosHoje,
      pendentesHoje,
      consultasSemana: consultasSemana.length,
      proximos,
      alertas,
      ad7,
      ad30,
      volume,
      medsEmDia,
    };
  }, [agenda, consultas, hojeExec]);

  const hour = new Date().getHours();
  const greet = greetingForHour(hour);
  const perfilNome = usuario?.perfil?.nome || 'Usuário';
  const bannerTitle = loading ? 'Carregando…' : `${greet}, ${firstName}!`;
  const bannerMetrics = loading
    ? ''
    : `${metrics.eventosHoje} evento${metrics.eventosHoje === 1 ? '' : 's'} hoje · ${metrics.pendentesHoje} pendente${metrics.pendentesHoje === 1 ? '' : 's'} · ${metrics.consultasSemana} consulta${metrics.consultasSemana === 1 ? '' : 's'} na semana`;

  const heatmapDayEvents = useMemo(() => {
    if (!heatmapDay) return [];
    return agenda.filter((e) => String(e.data_hora_inicio || '').startsWith(heatmapDay));
  }, [agenda, heatmapDay]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard operacional"
        description="Visão proativa de pacientes, agenda e aderência ao cuidado."
      />

      {/* Banner + carrossel */}
      <div className="overflow-hidden rounded-2xl border border-[#c5e4e1] bg-gradient-to-br from-[#e8f7f6] via-white to-[#f0f9ff] p-4 shadow-sm sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-aqua">Saudação</p>
        <p className="mt-1 font-display text-lg font-bold leading-snug text-ink sm:text-xl">
          {bannerTitle}
          {!loading ? (
            <span className="font-semibold text-aqua-deep"> · {perfilNome}</span>
          ) : null}
        </p>
        {!loading && bannerMetrics ? (
          <p className="mt-1 text-sm text-slate-health">{bannerMetrics}</p>
        ) : null}
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

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pacientes ativos"
          value={loading ? '…' : pacientesAtivos}
          hint="Cadastros com status ativo"
          to="/pacientes"
          accent="aqua"
        />
        <KpiCard
          label="Eventos de hoje"
          value={loading ? '…' : metrics.eventosHoje}
          hint={`${metrics.concluidosHoje} de ${metrics.eventosHoje || 0} concluídos`}
          to="/agenda"
          accent="emerald"
        />
        <KpiCard
          label="Consultas na semana"
          value={loading ? '…' : metrics.consultasSemana}
          hint="Próximos 7 dias"
          to="/consultas"
          accent="sky"
        />
        <KpiCard
          label="Alertas / ações"
          value={loading ? '…' : metrics.alertas}
          hint={metrics.alertas ? 'Pendentes ou atrasados hoje' : 'Nenhuma ação urgente'}
          to="/rotina"
          accent="amber"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Alertas / próximos */}
        <PlaceholderCard>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Próximos compromissos (7 dias)</h2>
            <Link to="/agenda" className="text-xs font-semibold text-aqua hover:underline">
              Ver agenda
            </Link>
          </div>
          <ul className="grid gap-1.5">
            {metrics.proximos.map((e) => {
              const tag = alertTag(e.data_hora_inicio, e.status);
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e8f1f0] bg-[#fbfefe] px-2.5 py-2"
                >
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${tag.className}`}>
                    {tag.label}
                  </span>
                  <span className="text-[11px] font-bold text-aqua-deep">
                    {countdownLabel(e.data_hora_inicio)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {e.titulo}
                    <span className="font-normal text-slate-health">
                      {' '}
                      · {e.tipo}
                      {e.paciente_nome ? ` · ${e.paciente_nome}` : ''}
                    </span>
                  </span>
                </li>
              );
            })}
            {!loading && !metrics.proximos.length ? (
              <p className="py-4 text-center text-sm text-slate-health">
                Nenhum compromisso nos próximos 7 dias.
              </p>
            ) : null}
            {loading ? (
              <p className="py-4 text-center text-sm text-slate-health">Carregando…</p>
            ) : null}
          </ul>
          <div className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Estoque / medicamentos
            </p>
            <p className="mt-0.5 text-xs text-amber-900/80">
              Checklist de hoje: {hojeExec.filter((i) => i.status === 'concluido').length}/
              {hojeExec.length || 0} doses confirmadas
              {metrics.medsEmDia < 80
                ? ' — atenção: aderência abaixo de 80%.'
                : ' — aderência saudável.'}
            </p>
            <Link to="/rotina" className="mt-1 inline-block text-xs font-semibold text-amber-800 hover:underline">
              Abrir medicamentos e atendimento
            </Link>
          </div>
        </PlaceholderCard>

        {/* Heatmap semanal */}
        <PlaceholderCard>
          <h2 className="mb-3 text-sm font-bold text-ink">Calendário operacional da semana</h2>
          <WeekHeatmap events={agenda} onDayClick={setHeatmapDay} />
          <p className="mt-3 text-[11px] text-slate-health">
            Clique em um dia para ver os compromissos. Intensidade = volume no dia.
          </p>
        </PlaceholderCard>
      </div>

      <Modal
        open={Boolean(heatmapDay)}
        title={
          heatmapDay
            ? `Eventos em ${new Date(`${heatmapDay}T12:00:00`).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}`
            : 'Eventos do dia'
        }
        onClose={() => setHeatmapDay(null)}
        wide
      >
        <ul className="grid gap-2">
          {heatmapDayEvents.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e8f1f0] bg-[#fbfefe] px-3 py-2 text-sm"
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
                  e.status === 'concluido'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {e.status}
              </span>
            </li>
          ))}
          {!heatmapDayEvents.length ? (
            <p className="py-4 text-center text-sm text-slate-health">
              Nenhum evento neste dia.
            </p>
          ) : null}
        </ul>
      </Modal>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PlaceholderCard>
          <h2 className="mb-1 text-sm font-bold text-ink">Aderência às atividades</h2>
          <p className="mb-3 text-[11px] text-slate-health">
            Concluídos vs. pendentes — últimos 7 e 30 dias
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: '7 dias', m: metrics.ad7 },
              { label: '30 dias', m: metrics.ad30 },
            ].map(({ label, m }) => (
              <div key={label} className="text-center">
                <div className="mx-auto h-36 w-full max-w-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={m.data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={38}
                        outerRadius={58}
                        paddingAngle={2}
                      >
                        {m.data.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-2xl font-bold tabular-nums text-ink">{m.pct}%</p>
                <p className="text-[11px] font-semibold text-slate-health">{label}</p>
              </div>
            ))}
          </div>
        </PlaceholderCard>

        <PlaceholderCard>
          <h2 className="mb-1 text-sm font-bold text-ink">Volume por categoria</h2>
          <p className="mb-3 text-[11px] text-slate-health">Últimos 30 dias na agenda</p>
          <div className="h-52 w-full">
            {metrics.volume.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.volume} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {metrics.volume.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-slate-health">
                Sem dados de volume no período.
              </p>
            )}
          </div>
        </PlaceholderCard>
      </div>

      {/* Sessão / auditoria discretos */}
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
