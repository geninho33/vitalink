const { Router } = require('express');
const controller = require('../controllers/usuarios.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('/usuarios', 'ler'), controller.listUsuarios);
router.post('/', requirePermission('/usuarios', 'criar'), controller.createUsuario);
router.put('/:id', requirePermission('/usuarios', 'editar'), controller.updateUsuario);
router.post('/:id/reset-senha', requirePermission('/usuarios', 'editar'), controller.resetSenha);
router.delete('/:id', requirePermission('/usuarios', 'deletar'), controller.deleteUsuario);

module.exports = router;
