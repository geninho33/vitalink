const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');
const logger = require('../utils/logger');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Token Bearer ausente ou inválido.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: 'unauthorized',
        message: expired ? 'Sessão expirada. Faça login novamente.' : 'Token inválido.',
      });
    }

    // JWT "sub" pode vir como string — normaliza para id numérico
    const userId = Number(decoded.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Token inválido (sujeito ausente).',
      });
    }

    let rows;
    try {
      rows = await query(
        `SELECT u.id, u.nome, u.email, u.status, u.perfil_id, p.nome AS perfil_nome
         FROM usuarios u
         INNER JOIN perfis p ON p.id = u.perfil_id
         WHERE u.id = :id
         LIMIT 1`,
        { id: userId }
      );
    } catch (dbErr) {
      // Erro de banco NÃO deve mascarar-se como 401 (causa "logout fantasma")
      logger.error('Falha ao validar usuário autenticado', {
        message: dbErr.message,
        code: dbErr.code,
      });
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Falha temporária ao validar a sessão. Tente novamente.',
      });
    }

    const user = rows[0];
    if (!user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Usuário do token não encontrado.',
      });
    }

    if (String(user.status).toLowerCase() !== 'ativo') {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Usuário inválido ou inativo.',
      });
    }

    // Perfil/permissões são sempre lidos do banco (token não é invalidado ao editar perfil)
    req.user = {
      id: Number(user.id),
      nome: user.nome,
      email: user.email,
      perfilId: Number(user.perfil_id),
      perfilNome: user.perfil_nome,
    };
    req.auth = { token, decoded };
    return next();
  } catch (err) {
    logger.error('Erro inesperado no authenticate', { message: err.message });
    return res.status(500).json({
      error: 'internal_error',
      message: 'Erro ao autenticar a requisição.',
    });
  }
}

module.exports = { authenticate };
