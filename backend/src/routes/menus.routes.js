const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/me', authenticate, authController.menusMe);

module.exports = router;
