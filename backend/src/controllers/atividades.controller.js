const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const {
  upsertAgendaEvento,
  removeAgendaEvento,
  toSqlTimestamp,
} = require('../services/agenda.service');

function clientMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function listAgenda(req, res, next) {
  try {
    const { paciente_id, status, tipo, de, ate } = req.query;
    const where = [];
    const params = {};
    if (paciente_id) {
      where.push('a.paciente_id = :paciente_id');
      params.paciente_id = paciente_id;
    }
    if (status) {
      where.push('a.status = :status');
      params.status = status;
    }
    if (tipo) {
      where.push('a.tipo = :tipo');
      params.tipo = tipo;
    }
    if (de) {
      where.push('a.data_hora_inicio >= :de');
      params.de = toSqlTimestamp(de);
    }
    if (ate) {
      where.push('a.data_hora_inicio <= :ate');
      params.ate = toSqlTimestamp(ate);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
      `SELECT a.*, p.nome AS paciente_nome
       FROM agenda_eventos a
       INNER JOIN pacientes p ON p.id = a.paciente_id
       ${whereSql}
       ORDER BY a.data_hora_inicio ASC
       LIMIT 500`,
      params
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function listTimeline(req, res, next) {
  try {
    const pacienteId = req.params.pacienteId || req.query.paciente_id;
    if (!pacienteId) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe paciente_id.',
      });
    }
    const rows = await query(
      `SELECT a.*, p.nome AS paciente_nome
       FROM agenda_eventos a
       INNER JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.paciente_id = :pacienteId
       ORDER BY a.data_hora_inicio DESC
       LIMIT 300`,
      { pacienteId }
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function listConsultas(req, res, next) {
  try {
    const rows = await query(
      `SELECT c.*, p.nome AS paciente_nome, h.nome_fantasia AS hospital_nome
       FROM consultas c
       INNER JOIN pacientes p ON p.id = c.paciente_id
       LEFT JOIN hospitais_clinicas h ON h.id = c.hospital_clinica_id
       ORDER BY c.data_hora DESC
       LIMIT 200`
    );
    return res.json({ data: rows, pagination: { page: 1, pageSize: 200, total: rows.length } });
  } catch (err) {
    return next(err);
  }
}

async function createConsulta(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.paciente_id || !b.profissional_nome || !b.especialidade || !b.data_hora) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Campos obrigatórios: paciente_id, profissional_nome, especialidade, data_hora.',
      });
    }
    const dataHora = toSqlTimestamp(b.data_hora);
    const result = await query(
      `INSERT INTO consultas
        (paciente_id, medico_id, profissional_nome, especialidade, local_tipo,
         hospital_clinica_id, local_descricao, data_hora, status, lembrete_minutos,
         anotacoes_pos, observacoes)
       VALUES
        (:paciente_id, :medico_id, :profissional_nome, :especialidade, :local_tipo,
         :hospital_clinica_id, :local_descricao, :data_hora, :status, :lembrete_minutos,
         :anotacoes_pos, :observacoes)`,
      {
        paciente_id: b.paciente_id,
        medico_id: b.medico_id || null,
        profissional_nome: b.profissional_nome,
        especialidade: b.especialidade,
        local_tipo: b.local_tipo || 'clinica',
        hospital_clinica_id: b.hospital_clinica_id || null,
        local_descricao: b.local_descricao || null,
        data_hora: dataHora,
        status: b.status || 'pendente',
        lembrete_minutos: b.lembrete_minutos ?? 60,
        anotacoes_pos: b.anotacoes_pos || null,
        observacoes: b.observacoes || null,
      }
    );

    await upsertAgendaEvento({
      pacienteId: b.paciente_id,
      tipo: 'consulta',
      origemTabela: 'consultas',
      origemId: result.insertId,
      titulo: `Consulta: ${b.especialidade} — ${b.profissional_nome}`,
      descricao: b.observacoes || null,
      dataHoraInicio: dataHora,
      status: b.status || 'pendente',
    });

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'consultas',
      recursoId: result.insertId,
      ...clientMeta(req),
    });

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

async function updateConsulta(req, res, next) {
  try {
    const id = req.params.id;
    const b = req.body || {};
    const dataHora = b.data_hora ? toSqlTimestamp(b.data_hora) : null;
    await query(
      `UPDATE consultas SET
         paciente_id = COALESCE(:paciente_id, paciente_id),
         medico_id = COALESCE(:medico_id, medico_id),
         profissional_nome = COALESCE(:profissional_nome, profissional_nome),
         especialidade = COALESCE(:especialidade, especialidade),
         local_tipo = COALESCE(:local_tipo, local_tipo),
         hospital_clinica_id = COALESCE(:hospital_clinica_id, hospital_clinica_id),
         local_descricao = COALESCE(:local_descricao, local_descricao),
         data_hora = COALESCE(:data_hora, data_hora),
         status = COALESCE(:status, status),
         lembrete_minutos = COALESCE(:lembrete_minutos, lembrete_minutos),
         anotacoes_pos = COALESCE(:anotacoes_pos, anotacoes_pos),
         observacoes = COALESCE(:observacoes, observacoes)
       WHERE id = :id`,
      {
        id,
        paciente_id: b.paciente_id ?? null,
        medico_id: b.medico_id ?? null,
        profissional_nome: b.profissional_nome ?? null,
        especialidade: b.especialidade ?? null,
        local_tipo: b.local_tipo ?? null,
        hospital_clinica_id: b.hospital_clinica_id ?? null,
        local_descricao: b.local_descricao ?? null,
        data_hora: dataHora,
        status: b.status ?? null,
        lembrete_minutos: b.lembrete_minutos ?? null,
        anotacoes_pos: b.anotacoes_pos ?? null,
        observacoes: b.observacoes ?? null,
      }
    );

    const rows = await query(`SELECT * FROM consultas WHERE id = :id LIMIT 1`, { id });
    const c = rows[0];
    if (c) {
      await upsertAgendaEvento({
        pacienteId: c.paciente_id,
        tipo: 'consulta',
        origemTabela: 'consultas',
        origemId: c.id,
        titulo: `Consulta: ${c.especialidade} — ${c.profissional_nome}`,
        descricao: c.observacoes,
        dataHoraInicio: toSqlTimestamp(c.data_hora),
        status: c.status,
      });
    }

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'consultas',
      recursoId: id,
      ...clientMeta(req),
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteConsulta(req, res, next) {
  try {
    await removeAgendaEvento('consultas', req.params.id);
    await query(`DELETE FROM consultas WHERE id = :id`, { id: req.params.id });
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'deletar',
      recurso: 'consultas',
      recursoId: req.params.id,
      ...clientMeta(req),
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAgenda,
  listTimeline,
  listConsultas,
  createConsulta,
  updateConsulta,
  deleteConsulta,
};
