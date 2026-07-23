const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function pick(body, fields) {
  const out = {};
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      out[f] = body[f] === '' ? null : body[f];
    }
  }
  return out;
}

function requireFields(payload, fields) {
  const missing = fields.filter((f) => payload[f] == null || String(payload[f]).trim() === '');
  if (missing.length) {
    const err = new Error(`Campos obrigatórios: ${missing.join(', ')}.`);
    err.status = 400;
    err.code = 'validation_error';
    throw err;
  }
}

function createCrudController({
  table,
  recurso,
  menuRota,
  searchable = [],
  requiredCreate = [],
  optional = [],
  normalize,
  selectExtra = '',
  joins = '',
}) {
  const allFields = [...new Set([...requiredCreate, ...optional])];

  async function list(req, res, next) {
    try {
      const q = String(req.query.q || '').trim();
      const status = req.query.status;
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
      const offset = (page - 1) * pageSize;

      const where = [];
      const params = {};

      if (status) {
        where.push(`${table}.status = :status`);
        params.status = status;
      }
      if (q && searchable.length) {
        const parts = searchable.map((col, i) => {
          params[`q${i}`] = `%${q}%`;
          return `${col} LIKE :q${i}`;
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
         ORDER BY ${table}.id DESC
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
        `SELECT ${table}.* ${selectExtra} FROM ${table} ${joins} WHERE ${table}.id = :id LIMIT 1`,
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
      let payload = pick(req.body || {}, allFields);
      if (normalize) payload = normalize(payload, 'create');
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
      if (err.code === 'ER_DUP_ENTRY') {
        err.status = 409;
        err.message = 'Registro duplicado.';
      }
      return next(err);
    }
  }

  async function update(req, res, next) {
    try {
      let payload = pick(req.body || {}, allFields);
      if (normalize) payload = normalize(payload, 'update');
      const cols = Object.keys(payload);
      if (!cols.length) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Nenhum campo para atualizar.',
        });
      }

      const sets = cols.map((c) => `${c} = :${c}`).join(', ');
      await query(`UPDATE ${table} SET ${sets} WHERE id = :id`, {
        ...payload,
        id: req.params.id,
      });

      await writeAudit({
        usuarioId: req.user.id,
        acao: 'editar',
        recurso,
        recursoId: req.params.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.json({ ok: true });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        err.status = 409;
        err.message = 'Registro duplicado.';
      }
      return next(err);
    }
  }

  async function remove(req, res, next) {
    try {
      await query(`DELETE FROM ${table} WHERE id = :id`, { id: req.params.id });
      await writeAudit({
        usuarioId: req.user.id,
        acao: 'deletar',
        recurso,
        recursoId: req.params.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  return { list, getById, create, update, remove, menuRota };
}

function addressNormalize(payload) {
  if (payload.cep != null) payload.cep = onlyDigits(payload.cep).slice(0, 8);
  if (payload.documento != null) payload.documento = onlyDigits(payload.documento);
  if (payload.cpf != null) payload.cpf = onlyDigits(payload.cpf);
  if (payload.uf != null) payload.uf = String(payload.uf).toUpperCase().slice(0, 2);
  if (payload.uf_crm != null) payload.uf_crm = String(payload.uf_crm).toUpperCase().slice(0, 2);
  return payload;
}

module.exports = {
  createCrudController,
  onlyDigits,
  addressNormalize,
  requireFields,
  pick,
};
