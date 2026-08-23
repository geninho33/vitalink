const { query, isDuplicateKey } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { applyPacienteScope, assertPacienteAccess } = require('../services/pacienteScope.service');
const { upsertAgendaEvento, toSqlTimestamp } = require('../services/agenda.service');

function mapInicioTipoToAgenda(tipo) {
  const t = String(tipo || '').toLowerCase();
  if (t === 'medicamento') return 'medicamento';
  if (t === 'compromisso') return 'consulta';
  if (t === 'saude') return 'cuidado';
  return 'outro';
}

function clientMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function list(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const tipo = req.query.tipo;
    const status = req.query.status || 'ativo';
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = {};

    if (status) {
      where.push('i.status = :status');
      params.status = status;
    }
    if (tipo) {
      where.push('i.tipo = :tipo');
      params.tipo = tipo;
    }
    if (q) {
      where.push('(i.titulo ILIKE :q OR i.descricao ILIKE :q)');
      params.q = `%${q}%`;
    }
    if (req.query.paciente_id) {
      where.push('i.paciente_id = :paciente_id');
      params.paciente_id = Number(req.query.paciente_id);
    }
    const scope = await applyPacienteScope(req.user, 'i.paciente_id');
    if (scope?.sql) {
      where.push(`(${scope.sql} OR i.paciente_id IS NULL AND i.usuario_id = :scopeUserId)`);
      Object.assign(params, scope.params);
      params.scopeUserId = req.user.id;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRows = await query(
      `SELECT COUNT(*) AS total FROM inicio_registros i ${whereSql}`,
      params
    );
    const data = await query(
      `SELECT i.*,
              u.nome AS usuario_nome,
              p.nome AS paciente_nome
       FROM inicio_registros i
       LEFT JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN pacientes p ON p.id = i.paciente_id
       ${whereSql}
       ORDER BY i.data_registro DESC, i.id DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    return res.json({
      data,
      pagination: {
        page,
        pageSize,
        total: Number(countRows[0]?.total || 0),
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const rows = await query(
      `SELECT i.*, u.nome AS usuario_nome, p.nome AS paciente_nome
       FROM inicio_registros i
       LEFT JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN pacientes p ON p.id = i.paciente_id
       WHERE i.id = :id
       LIMIT 1`,
      { id: req.params.id }
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Registro não encontrado.' });
    }
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.titulo || !b.descricao) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Campos obrigatórios: titulo, descricao.',
      });
    }
    if (b.paciente_id) {
      await assertPacienteAccess(req.user, b.paciente_id);
    }

    const result = await query(
      `INSERT INTO inicio_registros
        (usuario_id, paciente_id, titulo, descricao, tipo, data_registro, prioridade, status)
       VALUES
        (:usuario_id, :paciente_id, :titulo, :descricao, :tipo, COALESCE(:data_registro, CURRENT_TIMESTAMP),
         :prioridade, :status)`,
      {
        usuario_id: req.user.id,
        paciente_id: b.paciente_id || null,
        titulo: String(b.titulo).trim(),
        descricao: String(b.descricao).trim(),
        tipo: b.tipo || 'saude',
        data_registro: b.data_registro || null,
        prioridade: b.prioridade || 'media',
        status: b.status || 'ativo',
      }
    );

    if (b.paciente_id && result.insertId) {
      await upsertAgendaEvento({
        pacienteId: b.paciente_id,
        tipo: mapInicioTipoToAgenda(b.tipo),
        origemTabela: 'inicio_registros',
        origemId: result.insertId,
        titulo: String(b.titulo).trim(),
        descricao: String(b.descricao).trim(),
        dataHoraInicio: toSqlTimestamp(b.data_registro || new Date()),
        status: 'pendente',
      });
    }

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'inicio_registros',
      recursoId: result.insertId,
      ...clientMeta(req),
    });

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (isDuplicateKey(err)) {
      err.status = 409;
      err.message = 'Registro duplicado.';
    }
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const b = req.body || {};
    const id = req.params.id;
    const existing = await query(`SELECT id FROM inicio_registros WHERE id = :id LIMIT 1`, { id });
    if (!existing[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Registro não encontrado.' });
    }

    await query(
      `UPDATE inicio_registros SET
         titulo = COALESCE(:titulo, titulo),
         descricao = COALESCE(:descricao, descricao),
         tipo = COALESCE(:tipo, tipo),
         data_registro = COALESCE(:data_registro, data_registro),
         prioridade = COALESCE(:prioridade, prioridade),
         status = COALESCE(:status, status),
         paciente_id = COALESCE(:paciente_id, paciente_id)
       WHERE id = :id`,
      {
        id,
        titulo: b.titulo != null ? String(b.titulo).trim() : null,
        descricao: b.descricao != null ? String(b.descricao).trim() : null,
        tipo: b.tipo ?? null,
        data_registro: b.data_registro ?? null,
        prioridade: b.prioridade ?? null,
        status: b.status ?? null,
        paciente_id: b.paciente_id !== undefined ? b.paciente_id || null : null,
      }
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'inicio_registros',
      recursoId: id,
      ...clientMeta(req),
    });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = req.params.id;
    // Soft-delete: arquiva (mantém histórico)
    await query(`UPDATE inicio_registros SET status = 'arquivado' WHERE id = :id`, { id });
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'arquivar',
      recurso: 'inicio_registros',
      recursoId: id,
      ...clientMeta(req),
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  menuRota: '/inicio',
};
