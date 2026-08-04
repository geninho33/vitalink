import Icon from './Icon';

const STATUS_META = {
  concluido: {
    label: 'Concluído',
    dot: 'bg-emerald-500 text-white',
    card: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-950',
    icon: 'check',
  },
  realizado: {
    label: 'Realizado',
    dot: 'bg-emerald-500 text-white',
    card: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-950',
    icon: 'check',
  },
  pendente: {
    label: 'Pendente',
    dot: 'bg-amber-400 text-ink',
    card: 'border-amber-200/80 bg-amber-50/90 text-amber-950',
    icon: 'clock',
  },
  atrasado: {
    label: 'Atrasado',
    dot: 'bg-red-500 text-white',
    card: 'border-red-200/80 bg-red-50/90 text-red-950',
    icon: 'alert',
  },
  nao_realizado: {
    label: 'Não realizado',
    dot: 'bg-red-500 text-white',
    card: 'border-red-200/80 bg-red-50/90 text-red-950',
    icon: 'alert',
  },
  cancelado: {
    label: 'Cancelado',
    dot: 'bg-slate-400 text-white',
    card: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: 'x',
  },
};

function resolveStatus(status) {
  const key = String(status || 'pendente').toLowerCase();
  return STATUS_META[key] || STATUS_META.pendente;
}

function resolveCategoryIcon(category) {
  const raw = String(category || '').toLowerCase();
  if (raw.includes('medic') || raw.includes('remed') || raw.includes('pill')) return 'pill';
  if (raw.includes('consult') || raw.includes('médic')) return 'stethoscope';
  if (raw.includes('agenda') || raw.includes('appointment')) return 'calendar';
  if (raw.includes('saúde') || raw.includes('saude') || raw.includes('health') || raw.includes('rotina')) {
    return 'heart-pulse';
  }
  if (raw.includes('exame') || raw.includes('doc')) return 'scroll-text';
  return 'calendar';
}

/**
 * orientation: 'horizontal' (padrão Onda 2) | 'vertical'
 */
export default function TimelineRail({
  items = [],
  emptyMessage = 'Sem eventos.',
  orientation = 'horizontal',
}) {
  if (!items.length) {
    return <p className="py-8 text-center text-sm text-slate-health">{emptyMessage}</p>;
  }

  if (orientation === 'horizontal') {
    return <HorizontalRail items={items} />;
  }

  return <VerticalRail items={items} />;
}

function Marker({ item, status, icon, selected }) {
  const Comp = item.onClick ? 'button' : 'span';
  return (
    <Comp
      type={item.onClick ? 'button' : undefined}
      onClick={item.onClick}
      title={`${status.label}${item.category || item.type ? ` · ${item.category || item.type}` : ''}`}
      className={`grid h-8 w-8 place-items-center rounded-full border-[3px] border-white shadow-md transition ${
        status.dot
      } ${item.onClick ? 'cursor-pointer hover:scale-105' : ''} ${
        selected ? 'ring-2 ring-vita ring-offset-2' : ''
      }`}
      aria-label={item.title}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
    </Comp>
  );
}

function TimelineCard({ item, status, selected }) {
  const Comp = item.onClick ? 'button' : 'div';
  return (
    <Comp
      type={item.onClick ? 'button' : undefined}
      onClick={item.onClick}
      className={`w-full min-w-[10.5rem] max-w-[14rem] rounded-xl border px-3 py-2 text-left shadow-sm transition ${status.card} ${
        selected ? 'ring-2 ring-vita/35' : ''
      } ${item.onClick ? 'hover:brightness-[0.98]' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
          {item.category || item.type || item.tipo || 'Evento'}
        </span>
        <span className="rounded-md bg-white/75 px-1.5 py-0.5 text-[10px] font-bold">
          {status.label}
        </span>
      </div>
      <h3 className="mt-0.5 text-sm font-semibold leading-snug text-ink">{item.title}</h3>
      {item.subtitle || item.datetime ? (
        <p className="mt-0.5 text-[11px] opacity-75">{item.subtitle || item.datetime}</p>
      ) : null}
    </Comp>
  );
}

function HorizontalRail({ items }) {
  return (
    <div className="relative overflow-x-auto pb-2 pt-1">
      <div className="relative mx-auto min-w-max px-4 py-6">
        <div
          className="pointer-events-none absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-[#0077B6] via-[#00B4D8] to-[#48CAE4]"
          aria-hidden
        />
        <ol className="relative flex items-stretch gap-4">
          {items.map((item, index) => {
            const status = resolveStatus(item.status);
            const catIcon = resolveCategoryIcon(item.category || item.type || item.tipo);
            const markerIcon =
              item.status === 'concluido' || item.status === 'realizado' ? status.icon : catIcon;
            const above = index % 2 === 0;
            return (
              <li key={item.id} className="relative flex w-[12.5rem] flex-col items-center">
                {above ? (
                  <div className="mb-3 flex min-h-[5.5rem] items-end">
                    <TimelineCard item={item} status={status} selected={item.selected} />
                  </div>
                ) : (
                  <div className="mb-3 min-h-[5.5rem]" aria-hidden />
                )}
                <div className="relative z-10">
                  <Marker
                    item={item}
                    status={status}
                    icon={markerIcon}
                    selected={item.selected}
                  />
                </div>
                {!above ? (
                  <div className="mt-3 flex min-h-[5.5rem] items-start">
                    <TimelineCard item={item} status={status} selected={item.selected} />
                  </div>
                ) : (
                  <div className="mt-3 min-h-[5.5rem]" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function VerticalRail({ items }) {
  return (
    <div className="relative mx-auto max-w-3xl py-1">
      <div
        className="pointer-events-none absolute bottom-3 left-[15px] top-3 w-0.5 bg-[#b9dedb] sm:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-3 left-1/2 top-3 hidden w-0.5 -translate-x-1/2 bg-gradient-to-b from-[#0077B6] via-[#00B4D8] to-[#48CAE4] sm:block"
        aria-hidden
      />
      <ol className="relative space-y-4">
        {items.map((item, index) => {
          const left = index % 2 === 0;
          const status = resolveStatus(item.status);
          const catIcon = resolveCategoryIcon(item.category || item.type || item.tipo);
          const markerIcon =
            item.status === 'concluido' || item.status === 'realizado' ? status.icon : catIcon;
          return (
            <li key={item.id} className="relative">
              <div className="hidden sm:grid sm:grid-cols-[1fr_2.5rem_1fr] sm:items-start">
                <div className={`pr-5 ${left ? '' : 'invisible pointer-events-none'}`}>
                  {left ? (
                    <TimelineCard item={item} status={status} selected={item.selected} />
                  ) : null}
                </div>
                <div className="relative z-10 flex justify-center pt-1">
                  <Marker
                    item={item}
                    status={status}
                    icon={markerIcon}
                    selected={item.selected}
                  />
                </div>
                <div className={`pl-5 ${left ? 'invisible pointer-events-none' : ''}`}>
                  {!left ? (
                    <TimelineCard item={item} status={status} selected={item.selected} />
                  ) : null}
                </div>
              </div>
              <div className="flex items-start gap-3 sm:hidden">
                <div className="relative z-10 shrink-0 pt-0.5">
                  <Marker
                    item={item}
                    status={status}
                    icon={markerIcon}
                    selected={item.selected}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <TimelineCard item={item} status={status} selected={item.selected} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
