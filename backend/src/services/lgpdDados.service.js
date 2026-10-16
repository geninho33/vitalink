/**
 * Direitos do titular (LGPD art. 18): exportação de dados e exclusão de conta com carência.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pool, query } = require('../config/database');
const { writeAudit } = require('./audit.service');
const logger = require('../utils/logger');
const { criarZip } = require('./zip');

const PERFIL_RESPONSAVEL = 5;
const PAPEIS_GESTOR = ['responsavel', 'autocuidado'];
const PAPEIS_TITULAR = ['autocuidado', 'paciente'];
const CARENCIA_MIN = Number(process.env.LGPD_EXCLUSAO_CARENCIA_MIN) || 15 * 24 * 60;
const LIMITE_LINHAS = 20000;
// Tabelas com paciente_id que não entram na exportação (vínculos/segredos técnicos).
const EXCLUIR_TABELAS = new Set(['usuario_paciente', 'usuario_perfis', 'convites', 'relatorio_links']);
const EXCLUIR_COLUNAS = new Set(['senha_hash', 'token_hash', 'p256dh', 'auth']);
const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));

function limpar(rows) {
  return rows.map((r) => {
    const o = {};
    for (const [k, v] of Object.entries(r)) if (!EXCLUIR_COLUNAS.has(k)) o[k] = v;
    return o;
  });
}

/** Pacientes que o usuário gerencia (responsável vinculado ou o próprio paciente). Não usa o "acesso total" de admin. */
async function pacientesGeridos(uid) {
  const rows = await query(
    `SELECT paciente_id FROM usuario_paciente WHERE usuario_id = :uid AND papel = ANY(:papeis)
     UNION SELECT pr.paciente_id FROM paciente_responsaveis pr JOIN responsaveis r ON r.id = pr.responsavel_id WHERE r.usuario_id = :uid
     UNION SELECT p.id FROM pacientes p JOIN responsaveis r ON r.id = p.responsavel_id WHERE r.usuario_id = :uid`,
    { uid, papeis: [...PAPEIS_GESTOR, 'paciente'] }
  );
  return [...new Set(rows.map((r) => Number(r.paciente_id)))].sort((a, b) => a - b);
}

let cacheTabelas = null;
async function tabelasComPaciente() {
  if (cacheTabelas) return cacheTabelas;
  const rows = await query(
    `SELECT c.table_name FROM information_schema.columns c
     JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public' AND c.column_name = 'paciente_id' AND t.table_type = 'BASE TABLE'
     ORDER BY c.table_name`
  );
  cacheTabelas = rows.map((r) => r.table_name).filter((t) => !EXCLUIR_TABELAS.has(t) && /^[a-z_]+$/.test(t));
  return cacheTabelas;
}

async function coletarExportacao(uid) {
  const [conta] = await query(
    `SELECT id, nome, email, cpf, data_nascimento, telefone, status, perfil_id, modo_familia,
            onboarding_concluido, email_verificado_em, created_at, updated_at
     FROM usuarios WHERE id = :uid`,
    { uid }
  );
  const secoes = {
    conta: conta ? [conta] : [],
    papeis: await query('SELECT id, perfil_id, paciente_id, rotulo, ativo, is_default FROM usuario_perfis WHERE usuario_id = :uid', { uid }),
    vinculos_pacientes: await query('SELECT paciente_id, papel, created_at FROM usuario_paciente WHERE usuario_id = :uid', { uid }),
    consentimentos_lgpd: await query(
      `SELECT c.documento_id, d.tipo, c.versao, c.aceito_em, c.revogado_em, c.ip, c.user_agent, c.hash_conteudo
       FROM lgpd_consentimentos c JOIN lgpd_documentos d ON d.id = c.documento_id WHERE c.usuario_id = :uid ORDER BY c.aceito_em`,
      { uid }
    ),
    notificacoes_inscricoes: (await query('SELECT id, endpoint, user_agent, created_at, last_success_at FROM push_subscriptions WHERE usuario_id = :uid', { uid }))
      .map((s) => ({ ...s, endpoint: (() => { try { return new URL(s.endpoint).host; } catch { return null; } })() })),
    convites_criados: await query('SELECT id, paciente_id, papel, rotulo, expires_at, usado_em, revogado_em, created_at FROM convites WHERE criado_por = :uid', { uid }),
    links_relatorio_criados: await query('SELECT id, paciente_id, periodo_inicio, periodo_fim, expires_at, revogado_em, visualizacoes, created_at FROM relatorio_links WHERE criado_por = :uid', { uid }),
    pedidos_exclusao: await query('SELECT id, status, solicitado_em, efetivar_em, cancelado_em, executado_em FROM lgpd_exclusoes WHERE usuario_id = :uid', { uid }),
    auditoria_minhas_acoes: await query(
      `SELECT acao, recurso, recurso_id, ip, created_at FROM auditoria_logs WHERE usuario_id = :uid ORDER BY id DESC LIMIT ${LIMITE_LINHAS}`,
      { uid }
    ),
  };
  const geridos = await pacientesGeridos(uid);
  const pacientes = {};
  for (const tabela of await tabelasComPaciente()) {
    const rows = await query(
      `SELECT * FROM "${tabela}" WHERE paciente_id = ANY(:ids) ORDER BY 1 LIMIT ${LIMITE_LINHAS}`,
      { ids: geridos }
    );
    if (rows.length) pacientes[`paciente_${tabela}`] = limpar(rows);
  }
  pacientes.paciente_pacientes = limpar(await query('SELECT * FROM pacientes WHERE id = ANY(:ids) ORDER BY id', { ids: geridos }));
  // Registros que o usuário criou em pacientes que ele não gerencia (ex.: como cuidador).
  const outros = {
    sinais_vitais_que_registrei: await query(
      'SELECT id, paciente_id, tipo, valor, sistolica, diastolica, unidade, medido_em, observacao, created_at FROM sinais_vitais WHERE registrado_por = :uid AND NOT (paciente_id = ANY(:ids))',
      { uid, ids: geridos }
    ),
    anotacoes_que_registrei: await query(
      'SELECT id, paciente_id, titulo, descricao, tipo, data_registro, created_at FROM inicio_registros WHERE usuario_id = :uid AND NOT (paciente_id = ANY(:ids))',
      { uid, ids: geridos }
    ),
    doses_que_confirmei: await query(
      'SELECT id, paciente_id, remedio_id, data_hora, status, confirmado_em FROM medicamento_doses WHERE confirmado_por = :uid AND NOT (paciente_id = ANY(:ids))',
      { uid, ids: geridos }
    ),
  };
  return {
    meta: {
      gerado_em: new Date().toISOString(),
      usuario_id: uid,
      pacientes_gerenciados: geridos,
      observacao: 'Exportação LGPD (art. 18, II e V). Inclui sua conta, dados que você criou e os pacientes que você gerencia. Arquivos enviados (fotos/exames) aparecem como metadados; baixe-os pelo app.',
    },
    ...secoes,
    ...pacientes,
    ...outros,
  };
}

function csvValor(v) {
  if (v == null) return '';
  let s = v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // evita fórmula em planilhas
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function paraCsv(rows) {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return `\ufeff${[cols.join(','), ...rows.map((r) => cols.map((c) => csvValor(r[c])).join(','))].join('\r\n')}\r\n`;
}

function montarZip(dados) {
  const files = [{ name: 'dados.json', data: JSON.stringify(dados, null, 2) }];
  for (const [k, v] of Object.entries(dados)) {
    if (Array.isArray(v) && v.length) files.push({ name: `csv/${k}.csv`, data: paraCsv(v) });
  }
  files.push({
    name: 'LEIA-ME.txt',
    data: 'Exportação de dados do VitaLink (LGPD).\r\ndados.json contém tudo; a pasta csv/ tem uma planilha por tipo de dado (abre no Excel/Planilhas).\r\n',
  });
  return criarZip(files);
}

/** O que acontecerá com cada paciente se a conta for excluída agora. */
async function planoExclusao(uid) {
  const meus = await query(
    `SELECT up.paciente_id, up.papel, p.nome FROM usuario_paciente up JOIN pacientes p ON p.id = up.paciente_id WHERE up.usuario_id = :uid`,
    { uid }
  );
  const legado = await query(
    `SELECT pr.paciente_id, 'responsavel' AS papel, p.nome FROM paciente_responsaveis pr
       JOIN responsaveis r ON r.id = pr.responsavel_id JOIN pacientes p ON p.id = pr.paciente_id WHERE r.usuario_id = :uid`,
    { uid }
  );
  const porPaciente = new Map();
  for (const r of [...meus, ...legado]) if (!porPaciente.has(Number(r.paciente_id))) porPaciente.set(Number(r.paciente_id), r);
  const plano = [];
  for (const [pid, r] of porPaciente) {
    const outros = await query(
      `SELECT up.usuario_id, up.papel, up.created_at FROM usuario_paciente up JOIN usuarios u ON u.id = up.usuario_id
       WHERE up.paciente_id = :pid AND up.usuario_id <> :uid AND u.status = 'ativo' ORDER BY up.created_at, up.usuario_id`,
      { pid, uid }
    );
    let acao;
    let novoGestor = null;
    if (PAPEIS_TITULAR.includes(r.papel)) acao = 'excluir_paciente';
    else if (outros.some((o) => PAPEIS_GESTOR.includes(o.papel))) acao = 'desvincular';
    else if (outros.length) {
      acao = 'transferir';
      novoGestor = Number(outros[0].usuario_id);
    } else acao = 'excluir_paciente';
    plano.push({ paciente_id: pid, paciente_nome: r.nome, meu_papel: r.papel, acao, outros_membros: outros.length, novo_gestor_id: novoGestor });
  }
  return plano;
}

async function apagarArquivosFisicos(client, pid) {
  const { rows } = await client.query('SELECT caminho FROM arquivos WHERE paciente_id = $1', [pid]);
  let n = 0;
  for (const r of rows) {
    const nome = path.basename(String(r.caminho || ''));
    if (!nome) continue;
    const alvo = path.resolve(UPLOAD_ROOT, nome);
    if (!alvo.startsWith(`${UPLOAD_ROOT}${path.sep}`)) continue;
    try {
      fs.unlinkSync(alvo);
      n += 1;
    } catch {
      /* já não existe */
    }
  }
  return n;
}

async function desvincular(client, uid, pid) {
  const p = [uid, pid];
  await client.query('DELETE FROM usuario_paciente WHERE usuario_id = $1 AND paciente_id = $2', p);
  await client.query('DELETE FROM usuario_perfis WHERE usuario_id = $1 AND paciente_id = $2', p);
  await client.query('DELETE FROM paciente_responsaveis WHERE paciente_id = $2 AND responsavel_id IN (SELECT id FROM responsaveis WHERE usuario_id = $1)', p);
  await client.query('UPDATE pacientes SET responsavel_id = NULL WHERE id = $2 AND responsavel_id IN (SELECT id FROM responsaveis WHERE usuario_id = $1)', p);
  await client.query('UPDATE pacientes SET cuidador_id = NULL WHERE id = $2 AND cuidador_id IN (SELECT id FROM cuidadores WHERE usuario_id = $1)', p);
  await client.query('UPDATE paciente_cuidador_vinculos SET ativo = FALSE WHERE paciente_id = $2 AND cuidador_id IN (SELECT id FROM cuidadores WHERE usuario_id = $1)', p);
}

async function executarExclusao(pedido) {
  const uid = Number(pedido.usuario_id);
  const plano = await planoExclusao(uid);
  const client = await pool.connect();
  const resumo = { pacientes: [], arquivos_apagados: 0 };
  try {
    await client.query('BEGIN');
    for (const item of plano) {
      if (item.acao === 'excluir_paciente') {
        resumo.arquivos_apagados += await apagarArquivosFisicos(client, item.paciente_id);
        await client.query('DELETE FROM pacientes WHERE id = $1', [item.paciente_id]);
      } else {
        if (item.acao === 'transferir' && item.novo_gestor_id) {
          await client.query(
            `UPDATE usuario_paciente SET papel = 'responsavel' WHERE usuario_id = $1 AND paciente_id = $2`,
            [item.novo_gestor_id, item.paciente_id]
          );
          await client.query(
            `INSERT INTO usuario_perfis (usuario_id, perfil_id, paciente_id, rotulo, ativo, is_default)
             VALUES ($1, $2, $3, $4, TRUE, FALSE) ON CONFLICT DO NOTHING`,
            [item.novo_gestor_id, PERFIL_RESPONSAVEL, item.paciente_id, `Responsável · ${item.paciente_nome || ''}`.trim()]
          );
        }
        await desvincular(client, uid, item.paciente_id);
      }
      resumo.pacientes.push({ paciente_id: item.paciente_id, acao: item.acao, novo_gestor_id: item.novo_gestor_id });
    }
    await client.query('UPDATE convites SET revogado_em = NOW() WHERE criado_por = $1 AND usado_em IS NULL AND revogado_em IS NULL', [uid]);
    await client.query('UPDATE relatorio_links SET revogado_em = NOW() WHERE criado_por = $1 AND revogado_em IS NULL', [uid]);
    await client.query('DELETE FROM push_subscriptions WHERE usuario_id = $1', [uid]);
    await client.query('DELETE FROM auth_tokens WHERE usuario_id = $1', [uid]);
    await client.query('DELETE FROM usuario_perfis WHERE usuario_id = $1', [uid]);
    await client.query('DELETE FROM usuario_paciente WHERE usuario_id = $1', [uid]);
    const anonPessoa = `SET nome = 'Pessoa excluída', cpf = NULL, email = NULL, telefone_principal = NULL, telefone_secundario = NULL,
      foto_url = NULL, cep = NULL, logradouro = NULL, numero = NULL, complemento = NULL, bairro = NULL, observacoes = NULL,
      status = 'inativo', usuario_id = NULL WHERE usuario_id = $1`;
    await client.query(`UPDATE responsaveis ${anonPessoa}`, [uid]);
    await client.query(`UPDATE cuidadores ${anonPessoa}`, [uid]);
    const senhaInutil = `!excluido!${crypto.randomBytes(24).toString('hex')}`;
    await client.query(
      `UPDATE usuarios SET nome = 'Usuário excluído', email = $2, cpf = NULL, telefone = NULL, data_nascimento = NULL,
         senha_hash = $3, status = 'inativo', email_verificado_em = NULL, updated_at = NOW()
       WHERE id = $1`,
      [uid, `excluido-${uid}@excluido.invalid`, senhaInutil]
    );
    // Prova do consentimento é mantida (art. 8º, §2º); IP/navegador deixam de ser necessários.
    await client.query('UPDATE lgpd_consentimentos SET ip = NULL, user_agent = NULL WHERE usuario_id = $1', [uid]);
    await client.query(
      `UPDATE lgpd_exclusoes SET status = 'concluida', executado_em = NOW(), resumo = $2 WHERE id = $1`,
      [pedido.id, JSON.stringify(resumo)]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await query(`UPDATE lgpd_exclusoes SET status = 'erro', erro = :e WHERE id = :id`, { id: pedido.id, e: String(err.message).slice(0, 500) });
    throw err;
  } finally {
    client.release();
  }
  await writeAudit({
    usuarioId: uid,
    acao: 'lgpd_exclusao_executada',
    recurso: 'lgpd_exclusoes',
    recursoId: pedido.id,
    metadados: resumo,
  });
  return resumo;
}

async function processarExclusoesVencidas() {
  const r = await query(
    `UPDATE lgpd_exclusoes e SET status = 'executando'
     FROM (SELECT id FROM lgpd_exclusoes WHERE status = 'agendada' AND efetivar_em <= NOW()
           ORDER BY efetivar_em FOR UPDATE SKIP LOCKED LIMIT 5) x
     WHERE e.id = x.id
     RETURNING e.id, e.usuario_id`
  );
  for (const pedido of r.rows || []) {
    try {
      const resumo = await executarExclusao(pedido);
      logger.info('Exclusão LGPD executada', { pedido_id: pedido.id, pacientes: resumo.pacientes.length });
    } catch (err) {
      logger.error('Falha na exclusão LGPD', { pedido_id: pedido.id, message: err.message });
    }
  }
}

function iniciarJobExclusao() {
  if (String(process.env.LGPD_JOB_DESATIVADO || '').toLowerCase() === 'true') return;
  const tick = () => processarExclusoesVencidas().catch((e) => logger.error('Job exclusão LGPD', { message: e.message }));
  setTimeout(tick, 20 * 1000);
  setInterval(tick, 60 * 1000).unref?.();
  logger.info('Job de exclusão LGPD iniciado', { carencia_min: CARENCIA_MIN });
}

module.exports = {
  CARENCIA_MIN,
  coletarExportacao,
  montarZip,
  planoExclusao,
  processarExclusoesVencidas,
  iniciarJobExclusao,
  pacientesGeridos,
};
