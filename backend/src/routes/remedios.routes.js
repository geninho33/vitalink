const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { mountCrud } = require('./crud.routes');
const { remedios, administrarRemedio } = require('../controllers/saude.controller');

function mountRemediosRoutes() {
  const router = Router();
  router.use(authenticate);
  router.post(
    '/:id/administrar',
    requirePermission('/remedios', 'editar'),
    administrarRemedio
  );
  router.use(mountCrud(remedios));
  return router;
}

module.exports = { mountRemediosRoutes };
