const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');

async function getAnamnese(req, res, next) {
  try {
    const rows = await query(
      `SELECT * FROM paciente_anamnese WHERE paciente_id = :id LIMIT 1`,
      { id: req.params.pacienteId }
    );
    return res.json({ data: rows[0] || null });
  } catch (err) {
    return next(err);
  }
}

async function upsertAnamnese(req, res, next) {
  try {
    const pacienteId = req.params.pacienteId;
    const b = req.body || {};
    const fields = [
      'doencas_preexistentes',
      'historico_familiar',
      'cirurgias_anteriores',
      'sono',
      'alimentacao',
      'mobilidade',
      'autonomia',
      'medicamentos_contraindicados',
      'alergias_alimentares',
      'limitacoes_fisicas_cognitivas',
      'instrucoes_cuidadores',
      'episodios_confusao',
      'contato_emergencia_nome',
      'contato_emergencia_telefone',
    ];
    const payload = { paciente_id: pacienteId };
    fields.forEach((f) => {
      payload[f] = b[f] ?? null;
    });

    await query(
      `INSERT INTO paciente_anamnese
        (paciente_id, doencas_preexistentes, historico_familiar, cirurgias_anteriores,
         sono, alimentacao, mobilidade, autonomia, medicamentos_contraindicados,
         alergias_alimentares, limitacoes_fisicas_cognitivas, instrucoes_cuidadores,
         episodios_confusao, contato_emergencia_nome, contato_emergencia_telefone)
       VALUES
        (:paciente_id, :doencas_preexistentes, :historico_familiar, :cirurgias_anteriores,
         :sono, :alimentacao, :mobilidade, :autonomia, :medicamentos_contraindicados,
         :alergias_alimentares, :limitacoes_fisicas_cognitivas, :instrucoes_cuidadores,
         :episodios_confusao, :contato_emergencia_nome, :contato_emergencia_telefone)
       ON DUPLICATE KEY UPDATE
         doencas_preexistentes = VALUES(doencas_preexistentes),
         historico_familiar = VALUES(historico_familiar),
         cirurgias_anteriores = VALUES(cirurgias_anteriores),
         sono = VALUES(sono),
         alimentacao = VALUES(alimentacao),
         mobilidade = VALUES(mobilidade),
         autonomia = VALUES(autonomia),
         medicamentos_contraindicados = VALUES(medicamentos_contraindicados),
         alergias_alimentares = VALUES(alergias_alimentares),
         limitacoes_fisicas_cognitivas = VALUES(limitacoes_fisicas_cognitivas),
         instrucoes_cuidadores = VALUES(instrucoes_cuidadores),
         episodios_confusao = VALUES(episodios_confusao),
         contato_emergencia_nome = VALUES(contato_emergencia_nome),
         contato_emergencia_telefone = VALUES(contato_emergencia_telefone)`,
      payload
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'upsert_anamnese',
      recurso: 'paciente_anamnese',
      recursoId: pacienteId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getAnamnese, upsertAnamnese };
