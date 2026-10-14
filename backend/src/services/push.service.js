const webpush = require('web-push');
const { query } = require('../config/database');
const logger = require('../utils/logger');

let configured = null;
function ensureConfigured() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:suporte@vitalink.app.br';
  if (!pub || !priv) {
    configured = false;
    return configured;
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } catch (err) {
    logger.error('VAPID inválido', { message: err.message });
    configured = false;
  }
  return configured;
}

function publicKey() {
  return ensureConfigured() ? process.env.VAPID_PUBLIC_KEY : null;
}

/**
 * Envia notificação a todos os aparelhos do usuário. Remove inscrições expiradas (404/410).
 * Payload NÃO deve conter dados de saúde. Helper reaproveitável p/ lembretes futuros.
 */
async function sendToUser(usuarioId, payload) {
  if (!ensureConfigured()) {
    const err = new Error('Notificações push não configuradas no servidor.');
    err.status = 503;
    err.code = 'push_not_configured';
    throw err;
  }
  const subs = await query(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE usuario_id = :uid`,
    { uid: usuarioId }
  );
  const body = JSON.stringify(payload);
  let enviados = 0;
  let removidos = 0;
  let falhas = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
        { TTL: 3600 }
      );
      enviados += 1;
      await query(`UPDATE push_subscriptions SET last_success_at = NOW() WHERE id = :id`, { id: s.id });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await query(`DELETE FROM push_subscriptions WHERE id = :id`, { id: s.id });
        removidos += 1;
      } else {
        falhas += 1;
        logger.warn('Falha ao enviar push', { status: err.statusCode, subscription_id: s.id });
      }
    }
  }
  return { total: subs.length, enviados, removidos, falhas };
}

module.exports = { publicKey, sendToUser, ensureConfigured };
