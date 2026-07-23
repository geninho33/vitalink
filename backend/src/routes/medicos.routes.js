const { Router } = require('express');
const controller = require('../controllers/medicos.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('/medicos', 'ler'), controller.listMedicos);
router.post('/', requirePermission('/medicos', 'criar'), controller.createMedico);
router.put('/:id', requirePermission('/medicos', 'editar'), controller.updateMedico);
router.delete('/:id', requirePermission('/medicos', 'deletar'), controller.deleteMedico);

module.exports = router;
