const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const push = require('../controllers/push.controller');

// Sempre sobre o próprio usuário (req.user.id).
const router = Router();
router.get('/vapid-public-key', push.vapidPublicKey);
router.post('/subscribe', authenticate, push.subscribe);
router.post('/unsubscribe', authenticate, push.unsubscribe);
router.post('/teste', authenticate, push.teste);

module.exports = router;
