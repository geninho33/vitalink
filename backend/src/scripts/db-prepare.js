/**
 * Aguarda PostgreSQL e aplica schema via pg (sem binários de SO).
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Client } = require('pg');

const cfg = {
  host: process.env.DB_HOST || 'vitalink-db',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'vitalink',
  password: process.env.DB_PASSWORD || 'vitalink_secret',
  database: process.env.DB_NAME || 'vitalink',
  runMigrations: (process.env.RUN_MIGRATIONS || 'true') === 'true',
  retries: Number(process.env.DB_WAIT_RETRIES || 20),
  delayMs: Number(process.env.DB_WAIT_DELAY_MS || 1500),
};

function resolveSqlDir() {
  if (process.env.SQL_DIR) return process.env.SQL_DIR;
  const candidates = [
    path.join(__dirname, '../../database'),
    path.join(__dirname, '../../../database'),
  ];
  return (
    candidates.find((dir) => fs.existsSync(path.join(dir, 'schema.postgres.sql'))) ||
    candidates[0]
  );
}

const SQL_DIR = resolveSqlDir();
const SCHEMA_FILE = path.join(SQL_DIR, 'schema.postgres.sql');

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

async function connectApp() {
  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    connectionTimeoutMillis: 8000,
    statement_timeout: 60000,
    query_timeout: 60000,
  });
  await client.connect();
  await client.query('SELECT 1');
  return client;
}

async function waitForAuth() {
  log(`Autenticando em ${cfg.host}:${cfg.port}/${cfg.database}...`);
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
      const client = await connectApp();
      log(`PostgreSQL OK via usuário app (${cfg.user}) na tentativa ${i}.`);
      return client;
    } catch (err) {
      lastErr = err;
      if (i === 1 || i % 10 === 0) {
        log(`Auth pendente (${i}/${cfg.retries}): ${err.code || ''} ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, cfg.delayMs));
    }
  }

  throw new Error(
    `PostgreSQL auth falhou: ${lastErr?.code || ''} ${lastErr?.message || lastErr}`
  );
}

async function tableExists(client, tableName) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS c
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return Number(res.rows[0]?.c || 0) > 0;
}

async function applySchema(client) {
  if (!cfg.runMigrations) {
    log('RUN_MIGRATIONS=false — pulando migrações.');
    return;
  }

  const hasUsuarios = await tableExists(client, 'usuarios');
  const hasAgenda = await tableExists(client, 'agenda_eventos');

  if (hasUsuarios && hasAgenda) {
    log('Banco já migrado (usuarios + agenda_eventos).');
    return;
  }

  if (!fs.existsSync(SCHEMA_FILE)) {
    log(`AVISO: schema não encontrado: ${SCHEMA_FILE}`);
    return;
  }

  log(`Aplicando ${path.basename(SCHEMA_FILE)}...`);
  const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');
  try {
    await client.query(sql);
    log('Schema PostgreSQL OK.');
  } catch (err) {
    // Em reexecução parcial, alguns objetos podem já existir
    log(`AVISO ao aplicar schema: ${err.code || ''} ${err.message}`);
  }
}

async function ensureAdminPermissions(client) {
  const count = await client.query(
    `SELECT COUNT(*)::int AS c FROM permissoes_acesso WHERE perfil_id = 1`
  );
  if (Number(count.rows[0]?.c || 0) > 0) return;

  const menus = await client.query(`SELECT COUNT(*)::int AS c FROM menus`);
  if (Number(menus.rows[0]?.c || 0) === 0) return;

  log('Restaurando permissões do perfil Administrador (matriz vazia detectada)...');
  await client.query(
    `INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
     SELECT 1, id, TRUE, TRUE, TRUE, TRUE FROM menus
     ON CONFLICT (perfil_id, menu_id) DO NOTHING`
  );
}

async function applyPatchInicio(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_inicio.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch Início não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch Início OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch Início: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchOnda0(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_onda0.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch Onda 0 não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch Onda 0 OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch Onda 0: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchOnda1(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_onda1.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch Onda 1 não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch Onda 1 OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch Onda 1: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchFormsUx(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_forms_ux.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch forms UX não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch forms UX OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch forms UX: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchOnda2(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_onda2.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch Onda 2 não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch Onda 2 OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch Onda 2: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchEmpresasCuidadores(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_empresas_cuidadores.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch empresas cuidadoras não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch empresas cuidadoras OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch empresas cuidadoras: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchOnda3(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_onda3_sugestoes.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch Onda 3 não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch Onda 3 OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch Onda 3: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchAutocuidado(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_autocuidado.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch Autocuidado não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch Autocuidado OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch Autocuidado: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchRegistroEscopo(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_registro_escopo.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch registro/escopo não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch registro/escopo OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch registro/escopo: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchCatalogoMedicamentos(client) {
  if (!cfg.runMigrations) return;

  const patchFile = path.join(SQL_DIR, 'patch_catalogo_medicamentos.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch catálogo de medicamentos não encontrado: ${patchFile}`);
    return;
  }

  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  const sql = fs.readFileSync(patchFile, 'utf8');
  try {
    await client.query(sql);
    log('Patch catálogo de medicamentos OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch catálogo: ${err.code || ''} ${err.message}`);
  }
}

async function applySeedCatalogoMedicamentos(client) {
  if (!cfg.runMigrations) return;
  if ((process.env.SEED_CATALOGO_MEDICAMENTOS || 'true') !== 'true') {
    log('SEED_CATALOGO_MEDICAMENTOS=false — pulando catálogo de medicamentos.');
    return;
  }

  try {
    const { seedCatalogoMedicamentos } = require('../seeds/catalogoMedicamentos.seeder');
    log('Populando catálogo de medicamentos (50+ / dosagens)...');
    const result = await seedCatalogoMedicamentos(client);
    log(`Catálogo de medicamentos: ${result.total} apresentações.`);
  } catch (err) {
    log(`AVISO ao popular catálogo de medicamentos: ${err.message}`);
  }
}

async function applySeedRedeSaude(client) {
  if (!cfg.runMigrations) return;
  if ((process.env.SEED_REDE_SAUDE || 'true') !== 'true') {
    log('SEED_REDE_SAUDE=false — pulando catálogo da rede de saúde.');
    return;
  }

  const seedFile = path.join(SQL_DIR, 'seed_rede_saude.sql');
  if (!fs.existsSync(seedFile)) {
    log(`AVISO: seeder rede de saúde não encontrado: ${seedFile}`);
    return;
  }

  log(`Aplicando ${path.basename(seedFile)} (idempotente)...`);
  const sql = fs.readFileSync(seedFile, 'utf8');
  try {
    await client.query(sql);
    log('Catálogo da rede de saúde OK.');
  } catch (err) {
    log(`AVISO ao aplicar catálogo da rede de saúde: ${err.code || ''} ${err.message}`);
  }
}

async function applyPatchReceitaMedicamento(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_receita_medicamento.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch receita medicamento não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch receita medicamento OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch receita medicamento: ${err.message}`);
  }
}

async function applyPatchSecurity20261009(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_security_2026_10_09.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch de segurança 2026-10-09 não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch de segurança 2026-10-09 OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch de segurança 2026-10-09: ${err.message}`);
  }
}

async function applyPatchCpfOpcionalModoFamilia(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_cpf_opcional_modo_familia.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch CPF opcional/modo família não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch CPF opcional/modo família OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch CPF opcional/modo família: ${err.message}`);
  }
}

async function applyPatchSinaisVitais(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_sinais_vitais.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch sinais vitais não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch sinais vitais OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch sinais vitais: ${err.message}`);
  }
}

async function applyPatchLgpdConsentimento(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_lgpd_consentimento.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch LGPD consentimento não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch LGPD consentimento OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch LGPD consentimento: ${err.message}`);
  }
}

async function applyPatchPushSubscriptions(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_push_subscriptions.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch push não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch push subscriptions OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch push subscriptions: ${err.message}`);
  }
}

async function applyPatchSinaisVitaisFaixas(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_sinais_vitais_faixas.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch faixas não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch faixas de sinais vitais OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch faixas de sinais vitais: ${err.message}`);
  }
}

async function applyPatchRelatorioLinks(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_relatorio_links.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch relatorio_links não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch links de relatório OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch links de relatório: ${err.message}`);
  }
}

async function applyPatchConvites(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_convites.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch convites não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch convites OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch convites: ${err.message}`);
  }
}

async function applyPatchLembretesDoses(client) {
  if (!cfg.runMigrations) return;
  const patchFile = path.join(SQL_DIR, 'patch_lembretes_doses.sql');
  if (!fs.existsSync(patchFile)) {
    log(`AVISO: patch lembretes não encontrado: ${patchFile}`);
    return;
  }
  log(`Aplicando ${path.basename(patchFile)} (idempotente)...`);
  try {
    await client.query(fs.readFileSync(patchFile, 'utf8'));
    log('Patch lembretes de doses OK.');
  } catch (err) {
    log(`AVISO ao aplicar patch lembretes de doses: ${err.message}`);
  }
}

async function main() {
  const client = await waitForAuth();
  try {
    await applySchema(client);
    await applyPatchInicio(client);
    await applyPatchOnda0(client);
    await applyPatchOnda1(client);
    await applyPatchFormsUx(client);
    await applyPatchOnda2(client);
    await applyPatchEmpresasCuidadores(client);
    await applyPatchOnda3(client);
    await applyPatchAutocuidado(client);
    await applyPatchRegistroEscopo(client);
    await applySeedRedeSaude(client);
    await applyPatchCatalogoMedicamentos(client);
    await applySeedCatalogoMedicamentos(client);
    await applyPatchReceitaMedicamento(client);
    await applyPatchSecurity20261009(client);
    await applyPatchCpfOpcionalModoFamilia(client);
    await applyPatchSinaisVitais(client);
    await applyPatchSinaisVitaisFaixas(client);
    await applyPatchLgpdConsentimento(client);
    await applyPatchPushSubscriptions(client);
    await applyPatchLembretesDoses(client);
    await applyPatchConvites(client);
    await applyPatchRelatorioLinks(client);
    await ensureAdminPermissions(client);
  } finally {
    await client.end().catch(() => {});
  }
  log('Prepare concluído.');
}

main().catch((err) => {
  console.error(`[vitalink-db-prepare] ERRO: ${err.message}`);
  process.exit(1);
});
