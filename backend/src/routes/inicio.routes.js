const { Router } = require('express');
const controller = require('../controllers/inicio.controller');
const medicamentos = require('../controllers/medicamentos.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = Router();
const rota = controller.menuRota;

router.use(authenticate);
router.get('/', requirePermission(rota, 'ler'), controller.list);
router.get('/farmacias', requirePermission(rota, 'ler'), medicamentos.listFarmacias);
router.post('/farmacia-rapida', requirePermission(rota, 'criar'), medicamentos.farmaciaRapida);
router.get('/medicamentos', requirePermission(rota, 'ler'), medicamentos.list);
router.post('/medicamentos', requirePermission(rota, 'criar'), medicamentos.create);
router.get('/medicamentos/:id/compras', requirePermission(rota, 'ler'), medicamentos.listCompras);
router.post('/medicamentos/:id/compras', requirePermission(rota, 'criar'), medicamentos.createCompra);
router.delete('/medicamentos/:id', requirePermission(rota, 'deletar'), medicamentos.remove);
router.get('/:id', requirePermission(rota, 'ler'), controller.getById);
router.post('/', requirePermission(rota, 'criar'), controller.create);
router.put('/:id', requirePermission(rota, 'editar'), controller.update);
router.delete('/:id', requirePermission(rota, 'deletar'), controller.remove);

module.exports = router;
