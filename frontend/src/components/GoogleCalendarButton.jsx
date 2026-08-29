import Icon from './Icon';
import { buildGoogleCalendarUrl } from '../utils/googleCalendar';

export default function GoogleCalendarButton({
  title,
  start,
  end,
  details,
  location,
  durationMinutes,
  event,
  compact = false,
  className = '',
}) {
  const payload = event || { title, start, end, details, location, durationMinutes };
  const href = buildGoogleCalendarUrl(payload);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        compact
          ? `inline-flex min-h-8 items-center gap-1 rounded-md border border-[#d7e8e7] px-2 py-1 text-[11px] font-bold text-aqua-deep hover:bg-aqua-soft/60 ${className}`
          : `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-aqua px-3 text-sm font-semibold text-aqua transition hover:bg-aqua-soft ${className}`
      }
      onClick={(e) => e.stopPropagation()}
    >
      <Icon name="calendar" className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {compact ? 'Google Agenda' : 'Adicionar à Google Agenda'}
    </a>
  );
}
