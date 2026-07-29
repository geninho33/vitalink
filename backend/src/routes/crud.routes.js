const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

/**
 * options.denyCreatePerfilIds / denyDeletePerfilIds — bloqueio hard além do RBAC de menu
 */
function mountCrud(controller, options = {}) {
  const router = Router();
  const rota = controller.menuRota;
  const denyCreate = new Set((options.denyCreatePerfilIds || []).map(Number));
  const denyDelete = new Set((options.denyDeletePerfilIds || []).map(Number));

  function blockIf(deniedSet, label) {
    return (req, res, next) => {
      if (deniedSet.has(Number(req.user.perfilId))) {
        return res.status(403).json({
          error: 'forbidden',
          message: `Seu perfil não pode ${label} este recurso.`,
        });
      }
      return next();
    };
  }

  router.use(authenticate);
  router.get('/', requirePermission(rota, 'ler'), controller.list);
  router.get('/:id', requirePermission(rota, 'ler'), controller.getById);
  router.post(
    '/',
    requirePermission(rota, 'criar'),
    blockIf(denyCreate, 'criar'),
    controller.create
  );
  router.put('/:id', requirePermission(rota, 'editar'), controller.update);
  router.delete(
    '/:id',
    requirePermission(rota, 'deletar'),
    blockIf(denyDelete, 'excluir'),
    controller.remove
  );

  return router;
}

module.exports = { mountCrud };
