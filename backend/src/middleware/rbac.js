const { query } = require('../config/database');

/**
 * Exige permissão de leitura (ou ação) no menu pela rota base.
 * action: 'ler' | 'criar' | 'editar' | 'deletar'
 */
function requirePermission(menuRota, action = 'ler') {
  const columnMap = {
    ler: 'pode_ler',
    criar: 'pode_criar',
    editar: 'pode_editar',
    deletar: 'pode_deletar',
  };

  const column = columnMap[action];
  if (!column) {
    throw new Error(`Ação RBAC inválida: ${action}`);
  }

  return async (req, res, next) => {
    try {
      const rows = await query(
        `SELECT pa.${column} AS permitido
         FROM permissoes_acesso pa
         INNER JOIN menus m ON m.id = pa.menu_id
         WHERE pa.perfil_id = :perfilId
           AND m.rota = :rota
           AND m.ativo = TRUE
         LIMIT 1`,
        { perfilId: req.user.perfilId, rota: menuRota }
      );

      const perfilId = Number(req.user.perfilId);
      const ownPatientActions = action === 'ler' || action === 'editar';
      const ownPatientProfile = perfilId === 6 || perfilId === 7;
      if (
        menuRota === '/pacientes' &&
        ownPatientActions &&
        ownPatientProfile
      ) {
        return next();
      }

      if (!rows[0] || !rows[0].permitido) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Permissão insuficiente para este recurso.',
        });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { requirePermission };
