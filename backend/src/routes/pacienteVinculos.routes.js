const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const vinculos = require('../controllers/pacienteCuidadorVinculos.controller');

function mountPacienteVinculosRoutes() {
  const router = Router({ mergeParams: true });
  router.use(authenticate);

  router.get(
    '/',
    requirePermission('/pacientes', 'ler'),
    vinculos.listByPaciente
  );
  router.post(
    '/',
    requirePermission('/pacientes', 'editar'),
    vinculos.create
  );
  router.put(
    '/:vinculoId',
    requirePermission('/pacientes', 'editar'),
    vinculos.update
  );
  router.delete(
    '/:vinculoId',
    requirePermission('/pacientes', 'editar'),
    vinculos.remove
  );

  return router;
}

module.exports = { mountPacienteVinculosRoutes };
