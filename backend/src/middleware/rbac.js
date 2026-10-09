const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware RBAC: verifica se o usuário autenticado tem permissão para acessar
 * a rota (menuRota) com a ação especificada (ler, criar, editar, deletar).
 * 
 * A verificação é feita consultando a tabela permissoes_acesso, que armazena
 * as permissões de cada perfil para cada menu/rota.
 * 
 * Perfis Admin (1), Médico (2) e Atendente (3) têm acesso irrestrito a todas as rotas.
 * 
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
      const user = req.user;
      if (!user || !user.perfilId) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Autenticação necessária.',
        });
      }

      const perfilId = Number(user.perfilId);
      
      // Perfis com acesso irrestrito (Admin, Médico, Atendente)
      const UNRESTRICTED_PROFILES = [1, 2, 3];
      if (UNRESTRICTED_PROFILES.includes(perfilId)) {
        return next();
      }

      // Buscar permissão na tabela permissoes_acesso
      const rows = await query(
        `SELECT pa.${column} AS permitido
         FROM permissoes_acesso pa
         INNER JOIN menus m ON m.id = pa.menu_id
         WHERE pa.perfil_id = :perfilId
           AND m.rota = :rota
           AND m.ativo = TRUE
         LIMIT 1`,
        { perfilId, rota: menuRota }
      );

      // Verificar se tem permissão
      if (rows[0] && rows[0].permitido) {
        return next();
      }

      // Sem permissão
      logger.warn('Acesso negado por RBAC', {
        usuario_id: user.id,
        perfil_id: perfilId,
        rota: menuRota,
        acao: action,
      });

      return res.status(403).json({
        error: 'forbidden',
        message: 'Você não tem permissão para realizar esta ação.',
      });
    } catch (err) {
      logger.error('Erro no middleware RBAC', { message: err.message });
      return next(err);
    }
  };
}

module.exports = { requirePermission };
