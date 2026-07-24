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
       ON CONFLICT (paciente_id) DO UPDATE SET
         doencas_preexistentes = EXCLUDED.doencas_preexistentes,
         historico_familiar = EXCLUDED.historico_familiar,
         cirurgias_anteriores = EXCLUDED.cirurgias_anteriores,
         sono = EXCLUDED.sono,
         alimentacao = EXCLUDED.alimentacao,
         mobilidade = EXCLUDED.mobilidade,
         autonomia = EXCLUDED.autonomia,
         medicamentos_contraindicados = EXCLUDED.medicamentos_contraindicados,
         alergias_alimentares = EXCLUDED.alergias_alimentares,
         limitacoes_fisicas_cognitivas = EXCLUDED.limitacoes_fisicas_cognitivas,
         instrucoes_cuidadores = EXCLUDED.instrucoes_cuidadores,
         episodios_confusao = EXCLUDED.episodios_confusao,
         contato_emergencia_nome = EXCLUDED.contato_emergencia_nome,
         contato_emergencia_telefone = EXCLUDED.contato_emergencia_telefone`,
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
