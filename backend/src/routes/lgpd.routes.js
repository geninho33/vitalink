const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const lgpd = require('../controllers/lgpd.controller');
const { exportLimiter } = require('../middleware/rateLimiter');

// Sempre sobre o próprio usuário (req.user.id); não há parâmetro de usuário (sem IDOR).
const router = Router();
router.get('/documentos', lgpd.listDocumentos);
router.get('/pendentes', authenticate, lgpd.pendentes);
router.post('/aceitar', authenticate, lgpd.aceitar);
router.get('/meus-consentimentos', authenticate, lgpd.meusConsentimentos);
router.post('/revogar', authenticate, lgpd.revogar);
router.get('/exportar', authenticate, exportLimiter, lgpd.exportar);
router.get('/exclusao', authenticate, lgpd.exclusaoStatus);
router.post('/exclusao', authenticate, lgpd.solicitarExclusao);
router.delete('/exclusao', authenticate, lgpd.cancelarExclusao);

module.exports = router;
