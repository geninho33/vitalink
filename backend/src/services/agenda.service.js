const { query } = require('../config/database');

/**
 * Sincroniza qualquer evento com data/hora na agenda central.
 */
async function upsertAgendaEvento({
  pacienteId,
  tipo,
  origemTabela,
  origemId,
  titulo,
  descricao,
  dataHoraInicio,
  dataHoraFim = null,
  status = 'pendente',
}) {
  await query(
    `INSERT INTO agenda_eventos
      (paciente_id, tipo, origem_tabela, origem_id, titulo, descricao,
       data_hora_inicio, data_hora_fim, status)
     VALUES
      (:pacienteId, :tipo, :origemTabela, :origemId, :titulo, :descricao,
       :dataHoraInicio, :dataHoraFim, :status)
     ON CONFLICT (origem_tabela, origem_id) DO UPDATE SET
       paciente_id = EXCLUDED.paciente_id,
       tipo = EXCLUDED.tipo,
       titulo = EXCLUDED.titulo,
       descricao = EXCLUDED.descricao,
       data_hora_inicio = EXCLUDED.data_hora_inicio,
       data_hora_fim = EXCLUDED.data_hora_fim,
       status = EXCLUDED.status`,
    {
      pacienteId,
      tipo,
      origemTabela,
      origemId,
      titulo,
      descricao: descricao || null,
      dataHoraInicio,
      dataHoraFim,
      status,
    }
  );
}

async function removeAgendaEvento(origemTabela, origemId) {
  await query(
    `DELETE FROM agenda_eventos WHERE origem_tabela = :origemTabela AND origem_id = :origemId`,
    { origemTabela, origemId }
  );
}

/** Formata Date/string para timestamp SQL (YYYY-MM-DD HH:mm:ss). */
function toSqlTimestamp(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).replace('T', ' ').slice(0, 19);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** @deprecated use toSqlTimestamp */
const toMysqlDatetime = toSqlTimestamp;

module.exports = {
  upsertAgendaEvento,
  removeAgendaEvento,
  toSqlTimestamp,
  toMysqlDatetime,
};
