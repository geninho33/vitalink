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
     ON DUPLICATE KEY UPDATE
       paciente_id = VALUES(paciente_id),
       tipo = VALUES(tipo),
       titulo = VALUES(titulo),
       descricao = VALUES(descricao),
       data_hora_inicio = VALUES(data_hora_inicio),
       data_hora_fim = VALUES(data_hora_fim),
       status = VALUES(status)`,
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

function toMysqlDatetime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).replace('T', ' ').slice(0, 19);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

module.exports = {
  upsertAgendaEvento,
  removeAgendaEvento,
  toMysqlDatetime,
};
