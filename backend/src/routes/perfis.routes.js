const { Router } = require('express');
const controller = require('../controllers/perfis.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('/perfis', 'ler'), controller.listPerfis);
router.post('/', requirePermission('/perfis', 'criar'), controller.createPerfil);
router.put('/:id', requirePermission('/perfis', 'editar'), controller.updatePermissoes);

module.exports = router;
