const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Registra ação de auditoria sem dados clínicos sensíveis.
 */
async function writeAudit({ usuarioId, acao, recurso, recursoId, ip, userAgent, metadados }) {
  try {
    await query(
      `INSERT INTO auditoria_logs
        (usuario_id, acao, recurso, recurso_id, ip, user_agent, metadados_json)
       VALUES
        (:usuarioId, :acao, :recurso, :recursoId, :ip, :userAgent, :metadados)`,
      {
        usuarioId: usuarioId || null,
        acao,
        recurso,
        recursoId: recursoId != null ? String(recursoId) : null,
        ip: ip || null,
        userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
        metadados: metadados ? JSON.stringify(logger.sanitize(metadados)) : null,
      }
    );
  } catch (err) {
    logger.warn('Falha ao gravar auditoria', { message: err.message });
  }
}

module.exports = { writeAudit };
