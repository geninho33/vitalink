const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function main() {
  const file = path.join(__dirname, '../../database/patch_inicio_ux.sql');
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
  console.log('patch_inicio_ux.sql aplicado.');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err.message || err);
  process.exitCode = 1;
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
});
