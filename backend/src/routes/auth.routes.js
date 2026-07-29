const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/login', authController.login);
router.get('/papeis', authenticate, authController.listPapeis);
router.post('/contexto', authenticate, authController.switchContext);

module.exports = router;
