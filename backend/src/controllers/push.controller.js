const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { validationError } = require('../utils/validation');
const push = require('../services/push.service');

function vapidPublicKey(_req, res) {
  const key = push.publicKey();
  if (!key) {
    return res.status(503).json({ error: 'push_not_configured', message: 'Notificações indisponíveis.' });
  }
  return res.json({ publicKey: key });
}

function validEndpoint(endpoint) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && endpoint.length <= 2000;
  } catch {
    return false;
  }
}

async function subscribe(req, res, next) {
  try {
    const b = req.body || {};
    const endpoint = String(b.endpoint || '');
    const p256dh = String(b.keys?.p256dh || '');
    const auth = String(b.keys?.auth || '');
    if (!validEndpoint(endpoint)) validationError('Inscrição inválida (endpoint).');
    if (!/^[A-Za-z0-9_-]{20,200}$/.test(p256dh) || !/^[A-Za-z0-9_-]{8,100}$/.test(auth)) {
      validationError('Inscrição inválida (chaves).');
    }
    // Endpoint pertence ao navegador; se outro usuário logar no mesmo aparelho, passa a ser dele.
    await query(
      `INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth, user_agent)
       VALUES (:uid, :endpoint, :p256dh, :auth, :ua)
       ON CONFLICT (endpoint) DO UPDATE
         SET usuario_id = EXCLUDED.usuario_id, p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent`,
      {
        uid: req.user.id,
        endpoint,
        p256dh,
        auth,
        ua: String(req.get('user-agent') || '').slice(0, 500) || null,
      }
    );
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'push_inscrever',
      recurso: 'push_subscriptions',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(201).json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function unsubscribe(req, res, next) {
  try {
    const endpoint = String(req.body?.endpoint || '');
    if (!endpoint) validationError('Informe o endpoint.');
    // Só remove inscrição do próprio usuário.
    const r = await query(
      `DELETE FROM push_subscriptions WHERE endpoint = :endpoint AND usuario_id = :uid`,
      { endpoint, uid: req.user.id }
    );
    return res.json({ ok: true, removidas: r.rowCount || 0 });
  } catch (err) {
    return next(err);
  }
}

async function teste(req, res, next) {
  try {
    const result = await push.sendToUser(req.user.id, {
      title: 'VitaLink',
      body: 'Notificação de teste: está funcionando neste aparelho.',
      tag: 'vitalink-teste',
      url: '/meus-dados',
    });
    if (!result.total) {
      return res.status(404).json({
        error: 'no_subscription',
        message: 'Nenhum aparelho com notificações ativadas para este usuário.',
      });
    }
    return res.json({ ok: true, ...result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { vapidPublicKey, subscribe, unsubscribe, teste };
