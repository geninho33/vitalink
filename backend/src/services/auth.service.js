const { query } = require('../config/database');
const { comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { getMenusByPerfil } = require('./menu.service');
const { writeAudit } = require('./audit.service');

async function login({ email, senha, ip, userAgent }) {
  const rows = await query(
    `SELECT u.id, u.nome, u.email, u.senha_hash, u.status, u.perfil_id, p.nome AS perfil_nome
     FROM usuarios u
     INNER JOIN perfis p ON p.id = u.perfil_id
     WHERE u.email = :email
     LIMIT 1`,
    { email: String(email).trim().toLowerCase() }
  );

  const user = rows[0];
  if (!user) {
    const err = new Error('Credenciais inválidas.');
    err.status = 401;
    err.code = 'invalid_credentials';
    throw err;
  }

  if (user.status !== 'ativo') {
    const err = new Error('Usuário inativo ou bloqueado.');
    err.status = 403;
    err.code = 'user_inactive';
    throw err;
  }

  const ok = await comparePassword(senha, user.senha_hash);
  if (!ok) {
    await writeAudit({
      usuarioId: user.id,
      acao: 'login_falha',
      recurso: 'auth',
      ip,
      userAgent,
    });
    const err = new Error('Credenciais inválidas.');
    err.status = 401;
    err.code = 'invalid_credentials';
    throw err;
  }

  const token = signToken({
    sub: user.id,
    perfilId: user.perfil_id,
  });

  const menus = await getMenusByPerfil(user.perfil_id);

  await writeAudit({
    usuarioId: user.id,
    acao: 'login_sucesso',
    recurso: 'auth',
    ip,
    userAgent,
  });

  return {
    token,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    usuario: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: {
        id: user.perfil_id,
        nome: user.perfil_nome,
      },
    },
    menus,
  };
}

module.exports = { login };
