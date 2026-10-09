const { Router } = require('express');
const { authLimiter, sensitiveAuthLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/auth.controller');
const authPublic = require('../controllers/authPublic.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

// Endpoints públicos sensíveis com rate limiting rigoroso
router.post('/login', authLimiter, authController.login);
router.post('/registro', sensitiveAuthLimiter, authPublic.registro);
router.post('/register', sensitiveAuthLimiter, authPublic.registro);
router.post('/confirmar-email', authPublic.confirmarEmail);
router.get('/confirmar-email', authPublic.confirmarEmail);
router.post('/confirm-email', authPublic.confirmarEmail);
router.get('/confirm-email', authPublic.confirmarEmail);
router.post('/esqueci-senha', sensitiveAuthLimiter, authPublic.esqueciSenha);
router.post('/forgot-password', sensitiveAuthLimiter, authPublic.esqueciSenha);
router.post('/redefinir-senha', sensitiveAuthLimiter, authPublic.redefinirSenha);
router.post('/reset-password', sensitiveAuthLimiter, authPublic.redefinirSenha);
router.post('/onboarding', authenticate, authPublic.onboarding);
router.get('/papeis', authenticate, authController.listPapeis);
router.post('/contexto', authenticate, authController.switchContext);

module.exports = router;
