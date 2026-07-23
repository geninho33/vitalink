const { Router } = require('express');
const controller = require('../controllers/remedios.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('/remedios', 'ler'), controller.listRemedios);
router.get('/:id', requirePermission('/remedios', 'ler'), controller.getRemedio);
router.post('/', requirePermission('/remedios', 'criar'), controller.createRemedio);
router.put('/:id', requirePermission('/remedios', 'editar'), controller.updateRemedio);
router.delete('/:id', requirePermission('/remedios', 'deletar'), controller.deleteRemedio);

module.exports = router;
