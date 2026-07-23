const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');

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

    const decoded = verifyToken(token);
    const rows = await query(
      `SELECT u.id, u.nome, u.email, u.status, u.perfil_id, p.nome AS perfil_nome
       FROM usuarios u
       INNER JOIN perfis p ON p.id = u.perfil_id
       WHERE u.id = :id
       LIMIT 1`,
      { id: decoded.sub }
    );

    const user = rows[0];
    if (!user || user.status !== 'ativo') {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Usuário inválido ou inativo.',
      });
    }

    req.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfilId: user.perfil_id,
      perfilNome: user.perfil_nome,
    };
    return next();
  } catch (_err) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Token expirado ou inválido.',
    });
  }
}

module.exports = { authenticate };
