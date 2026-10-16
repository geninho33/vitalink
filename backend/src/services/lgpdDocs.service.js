const { query } = require('../config/database');

// Versão vigente (ativa, já em vigor, mais recente) de cada tipo de documento.
const VIGENTES_SQL = `
  SELECT DISTINCT ON (d.tipo) d.id, d.tipo, d.versao, d.titulo, d.conteudo, d.obrigatorio, d.vigente_desde,
         COALESCE(d.exige_reaceite, TRUE) AS exige_reaceite
  FROM lgpd_documentos d
  WHERE d.ativo = TRUE AND d.vigente_desde <= NOW()
  ORDER BY d.tipo, d.vigente_desde DESC, d.id DESC`;

async function documentosVigentes() {
  return query(VIGENTES_SQL);
}

/**
 * Documentos obrigatórios pendentes. Um documento está aceito se houver aceite não revogado
 * da versão vigente OU de qualquer versão a partir da última que exige reaceite
 * (versões com exige_reaceite = FALSE são esclarecimentos e não pedem novo aceite).
 */
async function pendentesDoUsuario(usuarioId, { tipo } = {}) {
  return query(
    `SELECT v.* FROM (${VIGENTES_SQL}) v
     WHERE v.obrigatorio = TRUE
       ${tipo ? 'AND v.tipo = :tipo' : ''}
       AND NOT EXISTS (
         SELECT 1 FROM lgpd_consentimentos c
         JOIN lgpd_documentos d2 ON d2.id = c.documento_id
         WHERE c.usuario_id = :uid AND c.revogado_em IS NULL AND d2.tipo = v.tipo
           AND (d2.vigente_desde, d2.id) >= (
             SELECT r.vigente_desde, r.id FROM lgpd_documentos r
             WHERE r.tipo = v.tipo AND r.ativo = TRUE AND r.vigente_desde <= NOW()
               AND COALESCE(r.exige_reaceite, TRUE) = TRUE
             ORDER BY r.vigente_desde DESC, r.id DESC LIMIT 1)
       )
     ORDER BY CASE v.tipo
       WHEN 'termos_uso' THEN 1 WHEN 'politica_privacidade' THEN 2 ELSE 3 END`,
    { uid: usuarioId, tipo: tipo || null }
  );
}

async function consentimentoSaudeValido(usuarioId) {
  const p = await pendentesDoUsuario(usuarioId, { tipo: 'consentimento_dados_saude' });
  return p.length === 0;
}

module.exports = { VIGENTES_SQL, documentosVigentes, pendentesDoUsuario, consentimentoSaudeValido };
