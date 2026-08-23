const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const {
  upsertAgendaEvento,
  removeAgendaEvento,
  toSqlTimestamp,
} = require('../services/agenda.service');
const { applyPacienteScope, assertPacienteAccess } = require('../services/pacienteScope.service');

function clientMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

function combineDateTime(dateStr, timeStr) {
  const d = String(dateStr).slice(0, 10);
  const t = String(timeStr).length === 5 ? `${timeStr}:00` : String(timeStr);
  return `${d} ${t}`;
}

async function listRotinas(req, res, next) {
  try {
    const where = [];
    const params = {};
    const scope = await applyPacienteScope(req.user, 'r.paciente_id');
    if (scope?.sql) {
      where.push(`(${scope.sql})`);
      Object.assign(params, scope.params);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(
      `SELECT r.*, p.nome AS paciente_nome, m.nome_comercial AS remedio_nome
       FROM atendimentos_rotina r
       INNER JOIN pacientes p ON p.id = r.paciente_id
       LEFT JOIN remedios m ON m.id = r.remedio_id
       ${whereSql}
       ORDER BY r.id DESC
       LIMIT 200`,
      params
    );
    return res.json({ data: rows, pagination: { page: 1, pageSize: 200, total: rows.length } });
  } catch (err) {
    return next(err);
  }
}

async function createRotina(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.paciente_id || !b.horario || !b.data_inicio) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Campos obrigatórios: paciente_id, horario, data_inicio.',
      });
    }
    await assertPacienteAccess(req.user, b.paciente_id);
    const tipo = b.tipo && b.tipo !== 'medicamento' ? b.tipo : 'outro';
    const titulo = b.titulo || String(tipo).charAt(0).toUpperCase() + String(tipo).slice(1);
    const result = await query(
      `INSERT INTO atendimentos_rotina
        (paciente_id, tipo, remedio_id, titulo, descricao, horario, dias_semana,
         data_inicio, data_fim, status)
       VALUES
        (:paciente_id, :tipo, :remedio_id, :titulo, :descricao, :horario, :dias_semana,
         :data_inicio, :data_fim, :status)`,
      {
        paciente_id: b.paciente_id,
        tipo,
        remedio_id: b.remedio_id || null,
        titulo,
        descricao: b.descricao || null,
        horario: b.horario,
        dias_semana: b.dias_semana || '1,2,3,4,5,6,7',
        data_inicio: b.data_inicio,
        data_fim: b.data_fim || null,
        status: b.status || 'ativo',
      }
    );

    const start = new Date(`${b.data_inicio}T00:00:00`);
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const jsDay = day.getDay() === 0 ? 7 : day.getDay();
      const allowed = String(b.dias_semana || '1,2,3,4,5,6,7').split(',').map(Number);
      if (!allowed.includes(jsDay)) continue;
      const dateStr = day.toISOString().slice(0, 10);
      const prevista = combineDateTime(dateStr, b.horario);
      const exec = await query(
        `INSERT INTO atendimento_execucoes
          (atendimento_rotina_id, paciente_id, data_hora_prevista, status)
         VALUES (:rotinaId, :pacienteId, :prevista, 'pendente')
         ON CONFLICT (atendimento_rotina_id, data_hora_prevista) DO NOTHING
         RETURNING id`,
        { rotinaId: result.insertId, pacienteId: b.paciente_id, prevista }
      );
      if (exec.insertId) {
        await upsertAgendaEvento({
          pacienteId: b.paciente_id,
          tipo: b.tipo === 'medicamento' ? 'medicamento' : 'cuidado',
          origemTabela: 'atendimento_execucoes',
          origemId: exec.insertId,
          titulo,
          descricao: b.descricao || null,
          dataHoraInicio: prevista,
          status: 'pendente',
        });
      }
    }

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'atendimentos_rotina',
      recursoId: result.insertId,
      ...clientMeta(req),
    });
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

async function updateRotina(req, res, next) {
  try {
    const b = req.body || {};
    await query(
      `UPDATE atendimentos_rotina SET
         titulo = COALESCE(:titulo, titulo),
         descricao = COALESCE(:descricao, descricao),
         horario = COALESCE(:horario, horario),
         dias_semana = COALESCE(:dias_semana, dias_semana),
         data_fim = COALESCE(:data_fim, data_fim),
         status = COALESCE(:status, status),
         tipo = COALESCE(:tipo, tipo),
         remedio_id = COALESCE(:remedio_id, remedio_id)
       WHERE id = :id`,
      {
        id: req.params.id,
        titulo: b.titulo ?? null,
        descricao: b.descricao ?? null,
        horario: b.horario ?? null,
        dias_semana: b.dias_semana ?? null,
        data_fim: b.data_fim ?? null,
        status: b.status ?? null,
        tipo: b.tipo ?? null,
        remedio_id: b.remedio_id ?? null,
      }
    );
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'atendimentos_rotina',
      recursoId: req.params.id,
      ...clientMeta(req),
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteRotina(req, res, next) {
  try {
    const execs = await query(
      `SELECT id FROM atendimento_execucoes WHERE atendimento_rotina_id = :id`,
      { id: req.params.id }
    );
    for (const e of execs) {
      await removeAgendaEvento('atendimento_execucoes', e.id);
    }
    await query(`DELETE FROM atendimentos_rotina WHERE id = :id`, { id: req.params.id });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function listExecucoesHoje(req, res, next) {
  try {
    const pacienteId = req.query.paciente_id;
    const where = ['(e.data_hora_prevista::date) = CURRENT_DATE'];
    const params = {};
    if (pacienteId) {
      where.push('e.paciente_id = :pacienteId');
      params.pacienteId = pacienteId;
    }
    const scope = await applyPacienteScope(req.user, 'e.paciente_id');
    if (scope?.sql) {
      where.push(`(${scope.sql})`);
      Object.assign(params, scope.params);
    }
    const rows = await query(
      `SELECT e.*, r.titulo, r.tipo, p.nome AS paciente_nome
       FROM atendimento_execucoes e
       INNER JOIN atendimentos_rotina r ON r.id = e.atendimento_rotina_id
       INNER JOIN pacientes p ON p.id = e.paciente_id
       WHERE ${where.join(' AND ')}
       ORDER BY e.data_hora_prevista ASC`,
      params
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function confirmarExecucao(req, res, next) {
  try {
    const { status = 'concluido', motivo_nao_realizacao } = req.body || {};
    const id = req.params.id;
    const now = toSqlTimestamp(new Date());
    await query(
      `UPDATE atendimento_execucoes SET
         status = :status,
         motivo_nao_realizacao = :motivo,
         data_hora_realizada = CASE WHEN :status = 'concluido' THEN :now ELSE data_hora_realizada END,
         executado_por = :userId
       WHERE id = :id`,
      {
        id,
        status,
        motivo: motivo_nao_realizacao || null,
        now,
        userId: req.user.id,
      }
    );
    const rows = await query(`SELECT * FROM atendimento_execucoes WHERE id = :id`, { id });
    const e = rows[0];
    if (e) {
      const rotina = await query(`SELECT titulo, tipo FROM atendimentos_rotina WHERE id = :id`, {
        id: e.atendimento_rotina_id,
      });
      await upsertAgendaEvento({
        pacienteId: e.paciente_id,
        tipo: rotina[0]?.tipo === 'medicamento' ? 'medicamento' : 'cuidado',
        origemTabela: 'atendimento_execucoes',
        origemId: e.id,
        titulo: rotina[0]?.titulo || 'Atendimento',
        descricao: e.motivo_nao_realizacao,
        dataHoraInicio: toSqlTimestamp(e.data_hora_prevista),
        status: status === 'nao_realizado' ? 'nao_realizado' : status,
      });
    }
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'confirmar_atendimento',
      recurso: 'atendimento_execucoes',
      recursoId: id,
      ...clientMeta(req),
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listRotinas,
  createRotina,
  updateRotina,
  deleteRotina,
  listExecucoesHoje,
  confirmarExecucao,
};
