const { query } = require('../config/database');
const { upsertAgendaEvento, removeAgendaEvento, toSqlTimestamp } = require('./agenda.service');

const HORARIO = {
  manha: '08:00:00',
  tarde: '14:00:00',
  noite: '20:00:00',
};

function horariosDoDia(remedio) {
  const start = horaDoPeriodo(remedio);
  const interval = Number(remedio.intervalo_horas);
  if (!Number.isFinite(interval) || interval <= 0 || interval > 24) return [start];
  const [h, m] = start.split(':').map(Number);
  const times = [];
  let minutes = (Number.isFinite(h) ? h : 8) * 60 + (Number.isFinite(m) ? m : 0);
  const count = Math.max(1, Math.floor(24 / interval));
  for (let i = 0; i < count; i += 1) {
    const hh = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    times.push(`${hh}:${mm}:00`);
    minutes += interval * 60;
  }
  return times;
}

function horaDoPeriodo(remedio) {
  if (remedio.periodo_horario === 'personalizado' && remedio.hora_exata) {
    const t = String(remedio.hora_exata);
    return t.length === 5 ? `${t}:00` : t.slice(0, 8);
  }
  return HORARIO[remedio.periodo_horario] || HORARIO.manha;
}

function consumoDiario(remedio) {
  const explicit = Number(remedio.consumo_diario);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const match = String(remedio.quantidade_administrar || '').match(/[\d]+([.,]\d+)?/);
  if (match) {
    const n = Number(match[0].replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

function daysRemaining(remedio) {
  const stock = Number(remedio.quantidade_estoque || 0);
  const daily = consumoDiario(remedio);
  if (daily <= 0) return 0;
  return Math.ceil(stock / daily);
}

async function clearFutureDoses(remedioId) {
  const futuras = await query(
    `SELECT id FROM medicamento_doses
     WHERE remedio_id = :remedioId AND data_hora::date >= CURRENT_DATE`,
    { remedioId }
  );
  for (const row of futuras) {
    await removeAgendaEvento('medicamento_doses', row.id);
  }
  await query(
    `DELETE FROM medicamento_doses
     WHERE remedio_id = :remedioId AND data_hora::date >= CURRENT_DATE`,
    { remedioId }
  );
  await removeAgendaEvento('medicamento_reposicao', remedioId);
}

function startDate(fromDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!fromDate) return today;
  const parsed = new Date(`${String(fromDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return today;
  parsed.setHours(0, 0, 0, 0);
  return parsed > today ? parsed : today;
}

async function syncRemedioAgenda(remedio, { pacienteId, fromDate } = {}) {
  const pid = Number(pacienteId || remedio.paciente_id);
  if (!pid) return { doses: 0 };

  await clearFutureDoses(remedio.id);

  const daily = consumoDiario(remedio);
  const days = Math.min(60, Math.max(0, daysRemaining(remedio)));
  const horarios = horariosDoDia(remedio);
  const titulo = `${remedio.nome_comercial}${remedio.quantidade_administrar ? ` · ${remedio.quantidade_administrar}` : ''}`;
  const origin = startDate(fromDate);
  let created = 0;

  for (let i = 0; i < days; i += 1) {
    const day = new Date(origin);
    day.setDate(origin.getDate() + i);
    const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    for (const hora of horarios) {
      if (created >= 90) break;
      const iso = `${ymd} ${hora}`;
      const inserted = await query(
        `INSERT INTO medicamento_doses (remedio_id, paciente_id, data_hora, status)
         VALUES (:remedioId, :pacienteId, :dataHora, 'pendente')`,
        { remedioId: remedio.id, pacienteId: pid, dataHora: iso }
      );
      await upsertAgendaEvento({
        pacienteId: pid,
        tipo: 'medicamento',
        origemTabela: 'medicamento_doses',
        origemId: inserted.insertId,
        titulo,
        descricao: remedio.indicacao || remedio.instrucoes_uso || null,
        dataHoraInicio: toSqlTimestamp(iso),
        status: 'pendente',
      });
      created += 1;
    }
  }

  if (days > 0) {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + Math.max(0, days - 1));
    const alert = new Date(end);
    alert.setDate(alert.getDate() - 3);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alertDay = alert < today ? today : alert;
    const alertIso = `${alertDay.getFullYear()}-${String(alertDay.getMonth() + 1).padStart(2, '0')}-${String(alertDay.getDate()).padStart(2, '0')} 09:00:00`;
    await upsertAgendaEvento({
      pacienteId: pid,
      tipo: 'outro',
      origemTabela: 'medicamento_reposicao',
      origemId: remedio.id,
      titulo: `Reposição: ${remedio.nome_comercial}`,
      descricao: `Estoque previsto para acabar em ${days} dia(s). Realize uma nova compra.`,
      dataHoraInicio: toSqlTimestamp(alertIso),
      status: 'pendente',
    });
  }

  return { doses: created, days, daily };
}

module.exports = {
  consumoDiario,
  daysRemaining,
  horaDoPeriodo,
  horariosDoDia,
  syncRemedioAgenda,
  clearFutureDoses,
};
