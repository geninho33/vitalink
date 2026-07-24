/**
 * Aguarda MySQL e aplica migrações usando mysql2 (mesmo driver da API).
 * Evita falhas do mysqladmin/cliente Alpine contra MySQL 8 (causa do 502).
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'vitalink-db',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'vitalink',
  password: process.env.DB_PASSWORD || 'vitalink_secret',
  database: process.env.DB_NAME || 'vitalink',
  rootPassword: process.env.DB_ROOT_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || 'masterkey',
  runMigrations: (process.env.RUN_MIGRATIONS || 'true') === 'true',
  retries: Number(process.env.DB_WAIT_RETRIES || 90),
  delayMs: Number(process.env.DB_WAIT_DELAY_MS || 2000),
};

const SQL_DIR = process.env.SQL_DIR || path.join(__dirname, '../../database');

function log(msg) {
  console.log(`[vitalink-db-prepare] ${msg}`);
}

async function tryConnect({ user, password, database }) {
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user,
    password,
    database: database || undefined,
    multipleStatements: true,
    connectTimeout: 5000,
    // MySQL 8 / rede Docker: evita falha de SSL do cliente
    ssl: false,
  });
  await conn.query('SELECT 1');
  return conn;
}

async function waitForMysql() {
  log(`Aguardando MySQL em ${cfg.host}:${cfg.port}...`);
  let lastErr = null;

  for (let i = 1; i <= cfg.retries; i += 1) {
    // 1) usuário da aplicação (criado pelo entrypoint oficial do MySQL com host %)
    try {
      const conn = await tryConnect({
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
      });
      log(`MySQL OK via usuário app (${cfg.user}) na tentativa ${i}.`);
      return { conn, asRoot: false };
    } catch (err) {
      lastErr = err;
    }

    // 2) root via TCP
    try {
      const conn = await tryConnect({
        user: 'root',
        password: cfg.rootPassword,
      });
      log(`MySQL OK via root na tentativa ${i}.`);
      return { conn, asRoot: true };
    } catch (err) {
      lastErr = err;
    }

    if (i === 1 || i % 10 === 0) {
      log(
        `Ainda aguardando (tentativa ${i}/${cfg.retries}): ${lastErr?.code || ''} ${lastErr?.message || lastErr}`
      );
    }
    await new Promise((r) => setTimeout(r, cfg.delayMs));
  }

  throw new Error(
    `MySQL não ficou disponível a tempo: ${lastErr?.code || ''} ${lastErr?.message || lastErr}`
  );
}

async function tableExists(conn, tableName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [cfg.database, tableName]
  );
  return Number(rows[0]?.c || 0) > 0;
}

async function ensureGrants(conn) {
  log('Ajustando grants do usuário app...');
  const pwd = cfg.password.replace(/\\/g, '\\\\').replace(/'/g, "''");
  const user = cfg.user.replace(/'/g, "''");
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(
    `CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED WITH mysql_native_password BY '${pwd}'`
  );
  await conn.query(
    `ALTER USER '${user}'@'%' IDENTIFIED WITH mysql_native_password BY '${pwd}'`
  );
  await conn.query(
    `GRANT ALL PRIVILEGES ON \`${cfg.database}\`.* TO '${user}'@'%'`
  );
  await conn.query('FLUSH PRIVILEGES');
}

async function runSqlFile(conn, filePath) {
  if (!fs.existsSync(filePath)) {
    log(`AVISO: SQL não encontrado: ${filePath}`);
    return;
  }
  const name = path.basename(filePath);
  log(`Aplicando ${name}...`);
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await conn.query(sql);
    log(`${name} OK.`);
  } catch (err) {
    log(`AVISO: falha ao aplicar ${name}: ${err.code || ''} ${err.message}`);
  }
}

async function applyMigrations(conn, asRoot) {
  if (!cfg.runMigrations) {
    log('RUN_MIGRATIONS=false — pulando migrações.');
    return;
  }

  if (asRoot) {
    try {
      await ensureGrants(conn);
    } catch (err) {
      log(`AVISO: grants: ${err.message}`);
    }
  } else {
    log('Conectado como app user — pulando grants root.');
  }

  // Garante USE no schema alvo
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\``).catch(() => {});
  await conn.changeUser({ database: cfg.database }).catch(() => {});

  const hasUsuarios = await tableExists(conn, 'usuarios');
  const hasAgenda = await tableExists(conn, 'agenda_eventos');

  const schema = path.join(SQL_DIR, 'schema.sql');
  const patchSaude = path.join(SQL_DIR, 'patch_saude_modulos.sql');
  const patchAtiv = path.join(SQL_DIR, 'patch_atividades_anamnese.sql');

  if (!hasUsuarios) {
    log('Schema base ausente — aplicando schema + patches...');
    await runSqlFile(conn, schema);
    await runSqlFile(conn, patchSaude);
    await runSqlFile(conn, patchAtiv);
  } else if (!hasAgenda) {
    log('Patches de atividades ausentes — aplicando...');
    await runSqlFile(conn, patchSaude);
    await runSqlFile(conn, patchAtiv);
  } else {
    log('Banco já migrado (usuarios + agenda_eventos).');
  }
}

async function main() {
  const { conn, asRoot } = await waitForMysql();
  try {
    await applyMigrations(conn, asRoot);
  } finally {
    await conn.end().catch(() => {});
  }
  log('Prepare concluído — iniciando API.');
}

main().catch((err) => {
  console.error(`[vitalink-db-prepare] ERRO FATAL: ${err.message}`);
  process.exit(1);
});
