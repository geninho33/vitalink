/**
 * Gera URL de evento do Google Agenda (template web, sem OAuth).
 * Datas no padrão UTC ISO 8601 básico: YYYYMMDDTHHmmssZ
 */

export function toGoogleCalendarUtcStamp(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

export function combineLocalDateTime(dateStr, timeStr = '08:00') {
  const datePart = String(dateStr || '').slice(0, 10);
  const timePart = String(timeStr || '08:00').slice(0, 5);
  if (!datePart) return null;
  const iso = `${datePart}T${timePart.length === 5 ? timePart : '08:00'}:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function nextOccurrenceAtTime(timeHHmm, intervalHours = 24) {
  const now = new Date();
  const [hh, mm] = String(timeHHmm || '08:00')
    .split(':')
    .map((n) => Number(n));
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(Number.isFinite(hh) ? hh : 8, Number.isFinite(mm) ? mm : 0, 0, 0);
  const stepMs = Math.max(Number(intervalHours) || 24, 0.25) * 3600000;
  while (next.getTime() <= now.getTime()) {
    next.setTime(next.getTime() + stepMs);
  }
  return next;
}

export function medicationStartTime(med) {
  if (med?.periodo_horario === 'personalizado' && med?.hora_exata) {
    return String(med.hora_exata).slice(0, 5);
  }
  if (med?.periodo_horario === 'tarde') return '14:00';
  if (med?.periodo_horario === 'noite') return '20:00';
  return '08:00';
}

export function nextMedicationOccurrence(med) {
  return nextOccurrenceAtTime(medicationStartTime(med), Number(med?.intervalo_horas) || 24);
}

export function nextRotinaOccurrence(rotina) {
  const time = String(rotina?.horario || '08:00').slice(0, 5);
  const fromDate = combineLocalDateTime(rotina?.data_inicio, time);
  const now = new Date();
  if (fromDate && fromDate.getTime() > now.getTime()) return fromDate;
  return nextOccurrenceAtTime(time, 24);
}

/**
 * @param {{ title: string, start: Date|string, end?: Date|string, details?: string, location?: string, durationMinutes?: number }} opts
 */
export function buildGoogleCalendarUrl({
  title,
  start,
  end,
  details = '',
  location = '',
  durationMinutes = 60,
} = {}) {
  const startDate = start instanceof Date || start ? new Date(start) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) return '';

  const endDate =
    end != null
      ? new Date(end)
      : new Date(startDate.getTime() + Math.max(Number(durationMinutes) || 60, 5) * 60000);

  const startStamp = toGoogleCalendarUtcStamp(startDate);
  const endStamp = toGoogleCalendarUtcStamp(endDate);
  if (!startStamp || !endStamp) return '';

  const params = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(title || 'VitaLink')}`,
    `dates=${startStamp}/${endStamp}`,
  ];
  if (details) params.push(`details=${encodeURIComponent(details)}`);
  if (location) params.push(`location=${encodeURIComponent(location)}`);
  return `https://calendar.google.com/calendar/render?${params.join('&')}`;
}

export function consultaToCalendarEvent(consulta) {
  const start = consulta?.data_hora || consulta?.date;
  const time = consulta?.time;
  const when = time && !consulta?.data_hora ? combineLocalDateTime(consulta.date, time) : start;
  const local =
    consulta?.hospital_nome ||
    consulta?.location ||
    consulta?.local_descricao ||
    (consulta?.local_tipo ? String(consulta.local_tipo) : '');
  const medico = consulta?.profissional_nome || consulta?.doctor || '';
  const especialidade = consulta?.especialidade || consulta?.specialty || '';
  const title =
    consulta?.titulo ||
    consulta?.title ||
    [especialidade, medico].filter(Boolean).join(' · ') ||
    'Consulta';
  const details = [
    medico ? `Médico(a): ${medico}` : '',
    especialidade ? `Especialidade: ${especialidade}` : '',
    consulta?.observacoes || consulta?.contact || '',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    title: `Consulta: ${title}`,
    start: when,
    durationMinutes: 60,
    details,
    location: local,
  };
}

export function medicamentoToCalendarEvent(med) {
  const start = nextMedicationOccurrence(med);
  const dose = med?.quantidade_administrar || '';
  const details = [
    dose ? `Dosagem: ${dose}` : '',
    med?.indicacao ? `Indicação: ${med.indicacao}` : '',
    med?.intervalo_horas ? `Intervalo: a cada ${med.intervalo_horas}h` : '',
    med?.instrucoes_uso || '',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    title: `Medicamento: ${med?.nome_comercial || 'Dose'}`,
    start,
    durationMinutes: 15,
    details,
    location: med?.farmacia_nome || '',
  };
}

export function rotinaToCalendarEvent(item) {
  const start =
    item?.data_hora_prevista || item?.data_hora_inicio
      ? new Date(item.data_hora_prevista || item.data_hora_inicio)
      : nextRotinaOccurrence(item);
  const details = [item?.descricao, item?.tipo ? `Tipo: ${item.tipo}` : '']
    .filter(Boolean)
    .join('\n');
  return {
    title: item?.titulo || item?.title || 'Rotina VitaLink',
    start,
    durationMinutes: 15,
    details,
    location: '',
  };
}
