const { query } = require('../config/database');

function groupRows(rows) {
  const byName = new Map();
  for (const row of rows) {
    const key = `${row.nome_comercial}||${row.principio_ativo}`;
    if (!byName.has(key)) {
      byName.set(key, {
        nome_comercial: row.nome_comercial,
        principio_ativo: row.principio_ativo,
        classe_terapeutica: row.classe_terapeutica,
        dosagens: [],
        formas: [],
      });
    }
    const item = byName.get(key);
    if (row.dosagem && !item.dosagens.includes(row.dosagem)) {
      item.dosagens.push(row.dosagem);
    }
    if (row.forma_farmaceutica && !item.formas.includes(row.forma_farmaceutica)) {
      item.formas.push(row.forma_farmaceutica);
    }
  }
  for (const item of byName.values()) {
    item.dosagens.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
    item.formas.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  return [...byName.values()];
}

async function list(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const pageSize = Math.min(40, Math.max(1, Number(req.query.pageSize) || 20));
    const params = { limit: pageSize * 8 };
    const where = [];
    if (q) {
      params.like = `%${q}%`;
      params.prefix = `${q}%`;
      where.push('(nome_comercial ILIKE :like OR principio_ativo ILIKE :like)');
    }

    const rows = await query(
      `SELECT nome_comercial, principio_ativo, dosagem, forma_farmaceutica, classe_terapeutica
       FROM catalogo_medicamentos
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY
         ${
           q
             ? `CASE
                  WHEN nome_comercial ILIKE :prefix THEN 0
                  WHEN principio_ativo ILIKE :prefix THEN 1
                  ELSE 2
                END,`
             : ''
         }
         nome_comercial ASC, dosagem ASC
       LIMIT :limit`,
      params
    );

    return res.json({ data: groupRows(rows).slice(0, pageSize) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list };
