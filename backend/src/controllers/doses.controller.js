const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { assertPacienteAccess } = require('../services/pacienteScope.service');
const { validationError } = require('../utils/validation');
const lembretes = require('../services/lembretes.service');

const ACOES = {
  tomei: { status: 'tomada', agenda: 'concluido', audit: 'dose_tomada' },
  pular: { status: 'pulada', agenda: 'nao_realizado', audit: 'dose_pulada' },
};

async function list(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await assertPacienteAccess(req.user, pacienteId);
    const params = { pacienteId };
    let where = 'd.paciente_id = :pacienteId';
    if (req.query.status === 'pendente') {
      // Pendentes: já venceram (ou adiadas) e ainda não confirmadas, últimas 24h.
      where += ` AND d.status = 'pendente' AND COALESCE(d.adiado_ate, d.data_hora) <= NOW() + INTERVAL '5 minutes'
                 AND d.data_hora > NOW() - INTERVAL '24 hours'`;
    } else {
      // Padrão: hoje (fuso do app) ± 1 dia de folga.
      where += ` AND d.data_hora >= NOW() - INTERVAL '24 hours' AND d.data_hora <= NOW() + INTERVAL '24 hours'`;
    }
    const rows = await query(
      `SELECT d.id, d.paciente_id, d.remedio_id, d.data_hora, d.status, d.notificado_em, d.escalado_em,
              d.adiado_ate, d.confirmado_em, d.confirmado_por, u.nome AS confirmado_por_nome,
              r.nome_comercial AS remedio_nome, r.quantidade_administrar
       FROM medicamento_doses d
       JOIN remedios r ON r.id = d.remedio_id
       LEFT JOIN usuarios u ON u.id = d.confirmado_por
       WHERE ${where}
       ORDER BY d.data_hora ASC, d.id ASC
       LIMIT 200`,
      params
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function aplicarAcao({ doseId, acao, user, minutos, req }) {
  const rows = await query(`SELECT id, paciente_id, status FROM medicamento_doses WHERE id = :id LIMIT 1`, {
    id: doseId,
  });
  const dose = rows[0];
  if (!dose) {
    const err = new Error('Dose não encontrada.');
    err.status = 404;
    err.code = 'not_found';
    throw err;
  }
  await assertPacienteAccess(user, dose.paciente_id);
  if (dose.status !== 'pendente') {
    const err = new Error(`Esta dose já foi registrada (${dose.status}).`);
    err.status = 409;
    err.code = 'dose_ja_registrada';
    throw err;
  }
  if (acao === 'adiar') {
    const m = Number(minutos || 15);
    if (!Number.isInteger(m) || m < 5 || m > 120) validationError('Adiamento deve ser de 5 a 120 minutos.');
    // Zera o envio para o agendador lembrar de novo; escalonamento passa a contar do novo horário.
    await query(
      `UPDATE medicamento_doses
       SET adiado_ate = NOW() + (:m * INTERVAL '1 minute'), notificado_em = NULL
       WHERE id = :id AND status = 'pendente'`,
      { id: doseId, m }
    );
    await writeAudit({
      usuarioId: user.id,
      acao: 'dose_adiada',
      recurso: 'medicamento_doses',
      recursoId: doseId,
      ip: req?.ip,
      userAgent: req?.get?.('user-agent'),
      metadados: { minutos: m },
    });
    return { ok: true, status: 'pendente', adiado_min: m };
  }
  const a = ACOES[acao];
  if (!a) validationError('Ação inválida.');
  const upd = await query(
    `UPDATE medicamento_doses
     SET status = :status, confirmado_em = NOW(), confirmado_por = :uid
     WHERE id = :id AND status = 'pendente'`,
    { id: doseId, status: a.status, uid: user.id }
  );
  if (!upd.rowCount) {
    const err = new Error('Esta dose já foi registrada.');
    err.status = 409;
    err.code = 'dose_ja_registrada';
    throw err;
  }
  await query(
    `UPDATE agenda_eventos SET status = :st WHERE origem_tabela = 'medicamento_doses' AND origem_id = :id`,
    { st: a.agenda, id: doseId }
  ).catch(() => {});
  await writeAudit({
    usuarioId: user.id,
    acao: a.audit,
    recurso: 'medicamento_doses',
    recursoId: doseId,
    ip: req?.ip,
    userAgent: req?.get?.('user-agent'),
  });
  return { ok: true, status: a.status };
}

function acaoHandler(acao) {
  return async (req, res, next) => {
    try {
      const out = await aplicarAcao({
        doseId: Number(req.params.id),
        acao,
        user: req.user,
        minutos: req.body?.minutos,
        req,
      });
      return res.json(out);
    } catch (err) {
      return next(err);
    }
  };
}

/** Ação vinda do botão da notificação (service worker, sem JWT): token assinado por dose+usuário. */
async function acaoPorToken(req, res, next) {
  try {
    const acao = String(req.body?.acao || '');
    if (!['tomei', 'pular', 'adiar'].includes(acao)) validationError('Ação inválida.');
    const t = lembretes.lerTokenAcao(req.body?.token);
    if (!t) {
      return res.status(401).json({ error: 'unauthorized', message: 'Link da notificação inválido ou expirado.' });
    }
    const urows = await query(`SELECT id, perfil_id, status FROM usuarios WHERE id = :id LIMIT 1`, {
      id: t.usuarioId,
    });
    if (!urows[0] || urows[0].status !== 'ativo') {
      return res.status(401).json({ error: 'unauthorized', message: 'Usuário inválido.' });
    }
    const user = { id: Number(urows[0].id), perfilId: Number(urows[0].perfil_id) };
    const out = await aplicarAcao({ doseId: t.doseId, acao, user, minutos: 15, req });
    return res.json(out);
  } catch (err) {
    return next(err);
  }
}

async function getConfig(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await assertPacienteAccess(req.user, pacienteId);
    return res.json({ data: await lembretes.getConfig(pacienteId) });
  } catch (err) {
    return next(err);
  }
}

async function putConfig(req, res, next) {
  try {
    const b = req.body || {};
    const pacienteId = Number(b.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    const janela = Number(b.janela_escalonamento_min ?? 30);
    if (!Number.isInteger(janela) || janela < 5 || janela > 240) {
      validationError('A janela de confirmação deve ser de 5 a 240 minutos.');
    }
    await assertPacienteAccess(req.user, pacienteId);
    const bool = (k) => (b[k] === undefined ? lembretes.CONFIG_PADRAO[k] : b[k] === true);
    const cfg = {
      ativo: bool('ativo'),
      notificar_paciente: bool('notificar_paciente'),
      notificar_cuidadores: bool('notificar_cuidadores'),
      notificar_responsaveis: bool('notificar_responsaveis'),
      escalar_responsaveis: bool('escalar_responsaveis'),
      mostrar_nome_remedio: bool('mostrar_nome_remedio'),
    };
    await query(
      `INSERT INTO paciente_lembretes_config
        (paciente_id, ativo, janela_escalonamento_min, notificar_paciente, notificar_cuidadores,
         notificar_responsaveis, escalar_responsaveis, mostrar_nome_remedio, atualizado_por, updated_at)
       VALUES (:pacienteId, :ativo, :janela, :notificar_paciente, :notificar_cuidadores,
         :notificar_responsaveis, :escalar_responsaveis, :mostrar_nome_remedio, :uid, NOW())
       ON CONFLICT (paciente_id) DO UPDATE SET
         ativo = EXCLUDED.ativo, janela_escalonamento_min = EXCLUDED.janela_escalonamento_min,
         notificar_paciente = EXCLUDED.notificar_paciente, notificar_cuidadores = EXCLUDED.notificar_cuidadores,
         notificar_responsaveis = EXCLUDED.notificar_responsaveis,
         escalar_responsaveis = EXCLUDED.escalar_responsaveis,
         mostrar_nome_remedio = EXCLUDED.mostrar_nome_remedio,
         atualizado_por = EXCLUDED.atualizado_por, updated_at = NOW()
       RETURNING paciente_id AS id`,
      { pacienteId, janela, ...cfg, uid: req.user.id }
    );
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'config_lembretes',
      recurso: 'paciente_lembretes_config',
      recursoId: pacienteId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: { janela, ...cfg },
    });
    return res.json({ ok: true, data: await lembretes.getConfig(pacienteId) });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  tomei: acaoHandler('tomei'),
  pular: acaoHandler('pular'),
  adiar: acaoHandler('adiar'),
  acaoPorToken,
  getConfig,
  putConfig,
};
