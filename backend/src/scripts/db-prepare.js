/**
 * Após o TCP já estar aberto (entrypoint), autentica e aplica migrações via mysql2.
 * Sem binários de SO (nc/mysqladmin).
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'vitalink-db',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'vitalink',
  password: process.env.DB_PASSWORD || 'vitalink_secret',
  database: process.env.DB_NAME || 'vitalink',
  rootPassword: process.env.DB_ROOT_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || 'masterkey',
  runMigrations: (process.env.RUN_MIGRATIONS || 'true') === 'true',
  retries: Number(process.env.DB_WAIT_RETRIES || 60),
  delayMs: Number(process.env.DB_WAIT_DELAY_MS || 2000),
};

const SQL_DIR = process.env.SQL_DIR || path.join(__dirname, '../../database');

function log(msg) {
  console.log(`[vitalink-db-prepare] ${msg}`);
}

function waitTcp(host, port, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve();
    });
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      reject(new Error(`timeout TCP ${host}:${port}`));
    });
    socket.on('error', reject);
  });
}

async function tryConnect({ user, password, database }) {
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user,
    password,
    database: database || undefined,
    multipleStatements: true,
    connectTimeout: 8000,
  });
  await conn.query('SELECT 1');
  return conn;
}

async function waitForMysqlAuth() {
  log(`Autenticando em ${cfg.host}:${cfg.port}...`);
  let lastErr = null;

  for (let i = 1; i <= cfg.retries; i += 1) {
    try {
      await waitTcp(cfg.host, cfg.port);
    } catch (err) {
      lastErr = err;
      if (i === 1 || i % 10 === 0) {
        log(`TCP ainda fechado (${i}/${cfg.retries}): ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, cfg.delayMs));
      continue;
    }

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
        `Auth pendente (${i}/${cfg.retries}): ${lastErr?.code || ''} ${lastErr?.message || lastErr}`
      );
    }
    await new Promise((r) => setTimeout(r, cfg.delayMs));
  }

  throw new Error(
    `MySQL auth falhou: ${lastErr?.code || ''} ${lastErr?.message || lastErr}`
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
  const { conn, asRoot } = await waitForMysqlAuth();
  try {
    await applyMigrations(conn, asRoot);
  } finally {
    await conn.end().catch(() => {});
  }
  log('Prepare concluído.');
}

main().catch((err) => {
  console.error(`[vitalink-db-prepare] ERRO: ${err.message}`);
  process.exit(1);
});
