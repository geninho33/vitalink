const { query } = require('../config/database');

async function listAuditoria(req, res, next) {
  try {
    const { acao, recurso, de, ate, page = 1, pageSize = 20 } = req.query;
    const where = [];
    const params = {};
    if (acao) {
      where.push('a.acao = :acao');
      params.acao = acao;
    }
    if (recurso) {
      where.push('a.recurso = :recurso');
      params.recurso = recurso;
    }
    if (de) {
      where.push('a.created_at >= :de');
      params.de = de;
    }
    if (ate) {
      where.push('a.created_at <= :ate');
      params.ate = ate;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (Math.max(1, Number(page) || 1) - 1) * limit;

    const count = await query(
      `SELECT COUNT(*) AS total FROM auditoria_logs a ${whereSql}`,
      params
    );
    const rows = await query(
      `SELECT a.id, a.usuario_id, u.nome AS usuario_nome, a.acao, a.recurso, a.recurso_id,
              a.ip, a.created_at
       FROM auditoria_logs a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return res.json({
      data: rows,
      pagination: {
        page: Number(page) || 1,
        pageSize: limit,
        total: Number(count[0]?.total || 0),
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listAuditoria };
