const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

function mountCrud(controller) {
  const router = Router();
  const rota = controller.menuRota;

  router.use(authenticate);
  router.get('/', requirePermission(rota, 'ler'), controller.list);
  router.get('/:id', requirePermission(rota, 'ler'), controller.getById);
  router.post('/', requirePermission(rota, 'criar'), controller.create);
  router.put('/:id', requirePermission(rota, 'editar'), controller.update);
  router.delete('/:id', requirePermission(rota, 'deletar'), controller.remove);

  return router;
}

module.exports = { mountCrud };
