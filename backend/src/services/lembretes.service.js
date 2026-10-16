const crypto = require('crypto');
const { query } = require('../config/database');
const env = require('../config/env');
const logger = require('../utils/logger');
const push = require('./push.service');
const { consentimentoSaudeValido } = require('./lgpdDocs.service');

const TZ = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
const MAX_ATRASO_NOTIFICAR_MIN = 120; // não notifica doses muito antigas (ex.: após o deploy)
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const CONFIG_PADRAO = {
  ativo: true,
  janela_escalonamento_min: 30,
  notificar_paciente: true,
  notificar_cuidadores: true,
  notificar_responsaveis: true,
  escalar_responsaveis: true,
  mostrar_nome_remedio: false,
};

function hhmm(date) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

// ---- Token de ação (botões da notificação; o service worker não tem o JWT) ----
function b64(s) {
  return Buffer.from(s).toString('base64url');
}
function assinar(payload) {
  return crypto.createHmac('sha256', `lembrete:${env.jwt.secret}`).update(payload).digest('base64url');
}
function gerarTokenAcao(doseId, usuarioId) {
  const p = b64(JSON.stringify({ d: Number(doseId), u: Number(usuarioId), e: Date.now() + TOKEN_TTL_MS }));
  return `${p}.${assinar(p)}`;
}
function lerTokenAcao(token) {
  const [p, sig] = String(token || '').split('.');
  if (!p || !sig) return null;
  const esperado = assinar(p);
  if (sig.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) {
    return null;
  }
  try {
    const o = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (!o.d || !o.u || !o.e || o.e < Date.now()) return null;
    return { doseId: Number(o.d), usuarioId: Number(o.u) };
  } catch {
    return null;
  }
}

async function getConfig(pacienteId) {
  const rows = await query(`SELECT * FROM paciente_lembretes_config WHERE paciente_id = :pacienteId`, {
    pacienteId,
  });
  return { ...CONFIG_PADRAO, ...(rows[0] || {}), paciente_id: Number(pacienteId), personalizada: Boolean(rows[0]) };
}

/** Usuários vinculados ao paciente, com o papel de cada um (responsavel | cuidador | paciente). */
async function destinatarios(pacienteId) {
  const rows = await query(
    `SELECT DISTINCT usuario_id, papel FROM (
       SELECT up.usuario_id,
              CASE WHEN up.papel IN ('responsavel', 'cuidador') THEN up.papel ELSE 'paciente' END AS papel
       FROM usuario_paciente up WHERE up.paciente_id = :pid
       UNION
       SELECT r.usuario_id, 'responsavel' FROM paciente_responsaveis pr
         JOIN responsaveis r ON r.id = pr.responsavel_id
         WHERE pr.paciente_id = :pid AND r.usuario_id IS NOT NULL
       UNION
       SELECT r.usuario_id, 'responsavel' FROM pacientes p
         JOIN responsaveis r ON r.id = p.responsavel_id
         WHERE p.id = :pid AND r.usuario_id IS NOT NULL
       UNION
       SELECT c.usuario_id, 'cuidador' FROM paciente_cuidador_vinculos v
         JOIN cuidadores c ON c.id = v.cuidador_id
         WHERE v.paciente_id = :pid AND COALESCE(v.ativo, TRUE) = TRUE AND c.usuario_id IS NOT NULL
       UNION
       SELECT c.usuario_id, 'cuidador' FROM pacientes p
         JOIN cuidadores c ON c.id = p.cuidador_id
         WHERE p.id = :pid AND c.usuario_id IS NOT NULL
     ) x
     JOIN usuarios u ON u.id = x.usuario_id AND u.status = 'ativo'`,
    { pid: pacienteId }
  );
  const porUsuario = new Map();
  for (const r of rows) {
    const set = porUsuario.get(Number(r.usuario_id)) || new Set();
    set.add(r.papel);
    porUsuario.set(Number(r.usuario_id), set);
  }
  return porUsuario; // usuario_id -> Set(papéis)
}

function deveReceber(papeis, cfg, fase) {
  if (fase === 'escalonamento') return cfg.escalar_responsaveis && papeis.has('responsavel');
  return (
    (cfg.notificar_paciente && papeis.has('paciente')) ||
    (cfg.notificar_cuidadores && papeis.has('cuidador')) ||
    (cfg.notificar_responsaveis && papeis.has('responsavel'))
  );
}

async function enviarParaDestinatarios(dose, cfg, fase) {
  const users = await destinatarios(dose.paciente_id);
  const hora = hhmm(dose.data_hora);
  const nomeRemedio = cfg.mostrar_nome_remedio ? dose.remedio_nome : null;
  const primeiroNome = cfg.mostrar_nome_remedio ? String(dose.paciente_nome || '').split(' ')[0] : null;
  let title;
  let body;
  if (fase === 'escalonamento') {
    title = 'VitaLink · Dose não confirmada';
    body = nomeRemedio
      ? `Dose de ${nomeRemedio} das ${hora} para ${primeiroNome} ainda não foi confirmada.`
      : `Uma dose das ${hora} ainda não foi confirmada. Abra o app para ver.`;
  } else {
    title = 'VitaLink · Lembrete de remédio';
    body = nomeRemedio
      ? `Hora da dose de ${nomeRemedio} (${hora}) para ${primeiroNome}.`
      : `Há uma dose das ${hora} para confirmar.`;
  }
  const resumo = { usuarios: 0, enviados: 0, removidos: 0, falhas: 0 };
  for (const [uid, papeis] of users) {
    if (!deveReceber(papeis, cfg, fase)) continue;
    // Sem consentimento de saúde vigente: não envia dados de remédio por notificação.
    if (!(await consentimentoSaudeValido(uid).catch(() => false))) continue;
    resumo.usuarios += 1;
    try {
      const r = await push.sendToUser(uid, {
        title,
        body,
        tag: `dose-${dose.id}-${fase}`,
        url: `/inicio/doses?dose=${dose.id}`,
        dose_id: dose.id,
        acao_token: gerarTokenAcao(dose.id, uid),
        actions: [
          { action: 'tomei', title: 'Tomei' },
          { action: 'pular', title: 'Pular' },
          { action: 'adiar', title: 'Adiar 15 min' },
        ],
      });
      resumo.enviados += r.enviados;
      resumo.removidos += r.removidos;
      resumo.falhas += r.falhas;
    } catch (err) {
      if (err.code !== 'push_not_configured') logger.warn('Falha no envio de lembrete', { dose_id: dose.id });
      resumo.falhas += 1;
    }
  }
  return resumo;
}

/**
 * Um ciclo do agendador. Reivindica as doses com UPDATE ... RETURNING (FOR UPDATE SKIP LOCKED)
 * ANTES de enviar: no máximo um envio por dose, mesmo com reinício do backend.
 */
async function processarCiclo() {
  const resultado = { notificadas: 0, escalonadas: 0 };

  const devidas = await query(
    `UPDATE medicamento_doses d SET notificado_em = NOW()
     FROM (
       SELECT md.id FROM medicamento_doses md
       LEFT JOIN paciente_lembretes_config c ON c.paciente_id = md.paciente_id
       WHERE md.status = 'pendente'
         AND md.notificado_em IS NULL
         AND COALESCE(c.ativo, TRUE) = TRUE
         AND COALESCE(md.adiado_ate, md.data_hora) <= NOW()
         AND COALESCE(md.adiado_ate, md.data_hora) > NOW() - (:maxAtraso * INTERVAL '1 minute')
       ORDER BY md.data_hora
       LIMIT 100
       FOR UPDATE OF md SKIP LOCKED
     ) alvo
     WHERE d.id = alvo.id
     RETURNING d.id, d.paciente_id, d.remedio_id, d.data_hora`,
    { maxAtraso: MAX_ATRASO_NOTIFICAR_MIN }
  );
  for (const dose of devidas.rows || []) {
    await notificar(dose, 'lembrete');
    resultado.notificadas += 1;
  }

  const atrasadas = await query(
    `UPDATE medicamento_doses d SET escalado_em = NOW()
     FROM (
       SELECT md.id FROM medicamento_doses md
       LEFT JOIN paciente_lembretes_config c ON c.paciente_id = md.paciente_id
       WHERE md.status = 'pendente'
         AND md.escalado_em IS NULL
         AND md.notificado_em IS NOT NULL
         AND COALESCE(c.ativo, TRUE) = TRUE
         AND COALESCE(c.escalar_responsaveis, TRUE) = TRUE
         AND COALESCE(md.adiado_ate, md.data_hora)
             + (COALESCE(c.janela_escalonamento_min, 30) * INTERVAL '1 minute') <= NOW()
       ORDER BY md.data_hora
       LIMIT 100
       FOR UPDATE OF md SKIP LOCKED
     ) alvo
     WHERE d.id = alvo.id
     RETURNING d.id, d.paciente_id, d.remedio_id, d.data_hora`
  );
  for (const dose of atrasadas.rows || []) {
    await notificar(dose, 'escalonamento');
    resultado.escalonadas += 1;
  }
  return resultado;
}

async function notificar(dose, fase) {
  try {
    const info = await query(
      `SELECT r.nome_comercial AS remedio_nome, p.nome AS paciente_nome
       FROM remedios r, pacientes p WHERE r.id = :rid AND p.id = :pid`,
      { rid: dose.remedio_id, pid: dose.paciente_id }
    );
    const cfg = await getConfig(dose.paciente_id);
    const r = await enviarParaDestinatarios({ ...dose, ...(info[0] || {}) }, cfg, fase);
    logger.info('Lembrete de dose processado', { dose_id: dose.id, fase, ...r });
  } catch (err) {
    logger.error('Erro ao notificar dose', { dose_id: dose.id, fase, message: err.message });
  }
}

let timer = null;
let rodando = false;
function iniciarAgendador({ intervaloMs = 60 * 1000 } = {}) {
  if (timer || process.env.LEMBRETES_DESATIVADOS === 'true') return;
  const tick = async () => {
    if (rodando) return;
    rodando = true;
    try {
      await processarCiclo();
    } catch (err) {
      // Ex.: tabela/colunas ainda não migradas — tenta no próximo ciclo.
      logger.warn('Agendador de lembretes: ciclo falhou', { message: err.message });
    } finally {
      rodando = false;
    }
  };
  timer = setInterval(tick, intervaloMs);
  setTimeout(tick, 15 * 1000);
  logger.info('Agendador de lembretes iniciado', { intervalo_ms: intervaloMs });
}

module.exports = {
  TZ,
  CONFIG_PADRAO,
  getConfig,
  gerarTokenAcao,
  lerTokenAcao,
  processarCiclo,
  iniciarAgendador,
};
