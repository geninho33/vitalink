const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
});

/**
 * Converte placeholders nomeados (:nome) para posicionais ($1, $2, ...).
 * Ignora '::tipo' (cast Postgres) e strings literais simples.
 */
function namedToPositional(sql, params = {}) {
  if (!params || Array.isArray(params)) {
    return { text: sql, values: Array.isArray(params) ? params : [] };
  }

  const values = [];
  const text = sql.replace(/::[a-zA-Z_][\w]*|:[a-zA-Z_][\w]*/g, (match) => {
    if (match.startsWith('::')) return match;
    const name = match.slice(1);
    values.push(params[name] === undefined ? null : params[name]);
    return `$${values.length}`;
  });

  return { text, values };
}

function ensureReturningId(sql) {
  const trimmed = sql.trim().replace(/;?\s*$/, '');
  if (/^\s*INSERT\b/i.test(trimmed) && !/\bRETURNING\b/i.test(trimmed)) {
    return `${trimmed} RETURNING id`;
  }
  return trimmed;
}

/**
 * Helper compatível com o uso anterior (mysql2):
 * - SELECT/WITH → array de rows
 * - INSERT/UPDATE/DELETE → { insertId, affectedRows, rowCount, rows }
 */
async function query(sql, params) {
  let { text, values } = namedToPositional(sql, params);
  text = ensureReturningId(text);

  try {
    const result = await pool.query(text, values);
    const cmd = text.trim().split(/\s+/)[0].toUpperCase();

    if (cmd === 'SELECT' || cmd === 'WITH') {
      return result.rows;
    }

    return {
      insertId: result.rows[0]?.id ?? 0,
      affectedRows: result.rowCount ?? 0,
      rowCount: result.rowCount ?? 0,
      rows: result.rows,
    };
  } catch (err) {
    // Alias amigável para código de unique violation (antes ER_DUP_ENTRY)
    if (err.code === '23505') {
      err.code = '23505';
      err.mysqlCode = 'ER_DUP_ENTRY';
    }
    throw err;
  }
}

function isDuplicateKey(err) {
  return err && (err.code === '23505' || err.code === 'ER_DUP_ENTRY' || err.mysqlCode === 'ER_DUP_ENTRY');
}

module.exports = { pool, query, namedToPositional, isDuplicateKey };
