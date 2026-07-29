const { query } = require('../config/database');
const logger = require('../utils/logger');

const DIFF_SKIP = new Set([
  'senha',
  'senha_hash',
  'password',
  'token',
  'updated_at',
  'created_at',
]);

/**
 * Diff sanitizado entre dois objetos (apenas chaves do payload).
 */
function buildAuditDiff(before = {}, after = {}, fields) {
  const keys = fields || [
    ...new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
  ];
  const antes = {};
  const depois = {};
  let changed = false;

  for (const key of keys) {
    if (DIFF_SKIP.has(key)) continue;
    const a = before?.[key] ?? null;
    const b = after?.[key] ?? null;
    const same =
      a === b ||
      (a == null && b == null) ||
      String(a ?? '') === String(b ?? '');
    if (same) continue;
    changed = true;
    antes[key] = a;
    depois[key] = b;
  }

  if (!changed) return null;
  return logger.sanitize({ antes, depois });
}

/**
 * Registra ação de auditoria sem dados clínicos sensíveis.
 * metadados pode incluir { diff: { antes, depois } }.
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
        metadados: metadados ? logger.sanitize(metadados) : null,
      }
    );
  } catch (err) {
    logger.warn('Falha ao gravar auditoria', { message: err.message });
  }
}

module.exports = { writeAudit, buildAuditDiff };
