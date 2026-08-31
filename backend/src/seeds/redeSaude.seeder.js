/**
 * VitaLink — seeder idempotente do catálogo da rede de saúde.
 *
 * Uso:
 *   node src/seeds/redeSaude.seeder.js
 *   npm run db:seed:rede
 *
 * Aplica database/seed_rede_saude.sql (ON CONFLICT DO NOTHING).
 * Não apaga nem sobrescreve registros já existentes.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'vitalink',
  password: process.env.DB_PASSWORD || 'vitalink_secret',
  database: process.env.DB_NAME || 'vitalink',
};

const SQL_FILE_CANDIDATES = [
  process.env.REDE_SAUDE_SEED_FILE,
  path.join(__dirname, '../../database/seed_rede_saude.sql'),
  path.join(__dirname, '../../../database/seed_rede_saude.sql'),
].filter(Boolean);

function resolveSqlFile() {
  return SQL_FILE_CANDIDATES.find((file) => fs.existsSync(file));
}

function log(msg) {
  console.log(`[vitalink-seed-rede] ${msg}`);
}

async function seedRedeSaude(client) {
  const sqlFile = resolveSqlFile();
  if (!sqlFile) {
    throw new Error(`Arquivo não encontrado: ${SQL_FILE_CANDIDATES.join(' | ')}`);
  }
  log(`Aplicando ${path.basename(sqlFile)} (idempotente)...`);
  const sql = fs.readFileSync(sqlFile, 'utf8');
  await client.query(sql);
}

async function main() {
  const client = new Client(cfg);
  await client.connect();
  log(`Conectado em ${cfg.host}:${cfg.port}/${cfg.database}`);
  try {
    await seedRedeSaude(client);
    const counts = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM hospitais_clinicas) AS hospitais,
         (SELECT COUNT(*)::int FROM farmacias) AS farmacias,
         (SELECT COUNT(*)::int FROM medicos) AS medicos`
    );
    log(
      `OK (idempotente). Totais: hospitais/clínicas=${counts.rows[0].hospitais}, farmácias=${counts.rows[0].farmacias}, médicos=${counts.rows[0].medicos}`
    );
  } finally {
    await client.end().catch(() => {});
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[vitalink-seed-rede] ERRO: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { seedRedeSaude };
