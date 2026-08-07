const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { mountCrud } = require('./crud.routes');
const {
  remedios,
  administrarRemedio,
  listAdministracoesHoje,
} = require('../controllers/saude.controller');

function mountRemediosRoutes() {
  const router = Router();
  router.use(authenticate);
  router.get(
    '/administracoes-hoje',
    requirePermission('/remedios', 'ler'),
    listAdministracoesHoje
  );
  router.post(
    '/:id/administrar',
    requirePermission('/remedios', 'editar'),
    administrarRemedio
  );
  router.use(mountCrud(remedios));
  return router;
}

module.exports = { mountRemediosRoutes };
