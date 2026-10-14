const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const lgpd = require('../controllers/lgpd.controller');

// Sempre sobre o próprio usuário (req.user.id); não há parâmetro de usuário (sem IDOR).
const router = Router();
router.get('/documentos', lgpd.listDocumentos);
router.get('/pendentes', authenticate, lgpd.pendentes);
router.post('/aceitar', authenticate, lgpd.aceitar);
router.get('/meus-consentimentos', authenticate, lgpd.meusConsentimentos);

module.exports = router;
