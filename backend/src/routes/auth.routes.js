const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authPublic = require('../controllers/authPublic.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/login', authController.login);
router.post('/registro', authPublic.registro);
router.post('/register', authPublic.registro);
router.post('/confirmar-email', authPublic.confirmarEmail);
router.get('/confirmar-email', authPublic.confirmarEmail);
router.post('/confirm-email', authPublic.confirmarEmail);
router.get('/confirm-email', authPublic.confirmarEmail);
router.post('/esqueci-senha', authPublic.esqueciSenha);
router.post('/forgot-password', authPublic.esqueciSenha);
router.post('/redefinir-senha', authPublic.redefinirSenha);
router.post('/reset-password', authPublic.redefinirSenha);
router.post('/onboarding', authenticate, authPublic.onboarding);
router.get('/papeis', authenticate, authController.listPapeis);
router.post('/contexto', authenticate, authController.switchContext);

module.exports = router;
