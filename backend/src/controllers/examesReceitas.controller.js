const { query, isDuplicateKey } = require('../config/database');
const { writeAudit, buildAuditDiff } = require('../services/audit.service');
const { createCrudController, pick, requireFields } = require('../utils/crudFactory');

const table = 'exames_receitas';
const recurso = 'exames_receitas';
const menuRota = '/exames-receitas';
const requiredCreate = ['paciente_id', 'especialidade', 'titulo'];
const optional = [
  'tipo',
  'data_documento',
  'arquivo_id',
  'consulta_id',
  'agenda_evento_id',
  'observacoes',
];
const allFields = [...new Set([...requiredCreate, ...optional])];
const searchable = ['exames_receitas.titulo', 'exames_receitas.especialidade'];
const selectExtra = `, p.nome AS paciente_nome, a.caminho AS arquivo_caminho`;
const joins = `
  LEFT JOIN pacientes p ON p.id = exames_receitas.paciente_id
  LEFT JOIN arquivos a ON a.id = exames_receitas.arquivo_id`;

function normalize(payload) {
  const n = { ...payload };
  if (!n.tipo) n.tipo = 'exame';
  if (!n.data_documento) {
    n.data_documento = new Date().toISOString().slice(0, 10);
  }
  return n;
}

const base = createCrudController({
  table,
  recurso,
  menuRota,
  searchable,
  requiredCreate,
  optional,
  normalize,
  selectExtra,
  joins,
});

async function list(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const pacienteId = req.query.paciente_id;
    const especialidade = req.query.especialidade;
    const dataDocumento = req.query.data_documento || req.query.data;
    const agendaEventoId = req.query.agenda_evento_id;
    const consultaId = req.query.consulta_id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = {};

    if (pacienteId != null && String(pacienteId).trim() !== '') {
      where.push(`${table}.paciente_id = :paciente_id`);
      params.paciente_id = Number(pacienteId);
    }
    if (especialidade != null && String(especialidade).trim() !== '') {
      where.push(`${table}.especialidade ILIKE :especialidade`);
      params.especialidade = `%${String(especialidade).trim()}%`;
    }
    if (dataDocumento != null && String(dataDocumento).trim() !== '') {
      where.push(`${table}.data_documento = :data_documento`);
      params.data_documento = String(dataDocumento).slice(0, 10);
    }
    if (agendaEventoId != null && String(agendaEventoId).trim() !== '') {
      where.push(`${table}.agenda_evento_id = :agenda_evento_id`);
      params.agenda_evento_id = Number(agendaEventoId);
    }
    if (consultaId != null && String(consultaId).trim() !== '') {
      where.push(`${table}.consulta_id = :consulta_id`);
      params.consulta_id = Number(consultaId);
    }
    if (q && searchable.length) {
      const parts = searchable.map((col, i) => {
        params[`q${i}`] = `%${q}%`;
        return `${col} ILIKE :q${i}`;
      });
      where.push(`(${parts.join(' OR ')})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countRows = await query(
      `SELECT COUNT(*) AS total FROM ${table} ${joins} ${whereSql}`,
      params
    );
    const data = await query(
      `SELECT ${table}.* ${selectExtra}
       FROM ${table}
       ${joins}
       ${whereSql}
       ORDER BY ${table}.data_documento DESC, ${table}.id DESC
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

async function create(req, res, next) {
  try {
    let payload = pick(req.body || {}, allFields);
    payload = normalize(payload, 'create');
    requireFields(payload, requiredCreate);

    const cols = Object.keys(payload);
    const placeholders = cols.map((c) => `:${c}`).join(', ');
    const result = await query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
      payload
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso,
      recursoId: result.insertId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
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
    let payload = pick(req.body || {}, allFields);
    payload = normalize(payload, 'update');
    const cols = Object.keys(payload);
    if (!cols.length) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Nenhum campo para atualizar.',
      });
    }

    const beforeRows = await query(`SELECT * FROM ${table} WHERE id = :id LIMIT 1`, {
      id: req.params.id,
    });
    const before = beforeRows[0] || {};
    if (!before.id) {
      return res.status(404).json({ error: 'not_found', message: 'Registro não encontrado.' });
    }

    const sets = cols.map((c) => `${c} = :${c}`).join(', ');
    await query(`UPDATE ${table} SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = :id`, {
      ...payload,
      id: req.params.id,
    });

    const diff = buildAuditDiff(before, { ...before, ...payload }, cols);
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso,
      recursoId: req.params.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: diff ? { diff } : undefined,
    });

    return res.json({ ok: true });
  } catch (err) {
    if (isDuplicateKey(err)) {
      err.status = 409;
      err.message = 'Registro duplicado.';
    }
    return next(err);
  }
}

module.exports = {
  list,
  getById: base.getById,
  create,
  update,
  remove: base.remove,
  menuRota,
};
