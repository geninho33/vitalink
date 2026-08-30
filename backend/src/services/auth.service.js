const { query } = require('../config/database');
const { comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { getMenusByPerfil } = require('./menu.service');
const { writeAudit } = require('./audit.service');
const {
  listPapeisByUsuario,
  pickDefaultPapel,
  resolvePapel,
} = require('./papel.service');

function buildSessionPayload(user, papel, menus) {
  return {
    token: signToken({
      sub: user.id,
      perfilId: papel.perfil_id,
      pacienteId: papel.paciente_id || null,
      papelId: papel.id || null,
    }),
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    usuario: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone || '',
      cpf: user.cpf || '',
      data_nascimento: user.data_nascimento || null,
      perfil: {
        id: papel.perfil_id,
        nome: papel.perfil_nome,
      },
      paciente_ativo_id: papel.paciente_id || null,
      onboarding_concluido: user.onboarding_concluido !== false,
      papel_ativo: {
        id: papel.id,
        rotulo: papel.rotulo,
        perfil_id: papel.perfil_id,
        paciente_id: papel.paciente_id,
      },
    },
    menus,
    papeis: undefined, // preenchido pelo caller
  };
}

async function login({ email, senha, ip, userAgent }) {
  const rows = await query(
    `SELECT u.id, u.nome, u.email, u.senha_hash, u.status, u.perfil_id, p.nome AS perfil_nome,
            COALESCE(u.onboarding_concluido, TRUE) AS onboarding_concluido,
            u.telefone, u.cpf, u.data_nascimento
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

  if (user.status !== 'ativo' && user.status !== 'pendente_confirmacao') {
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

  if (user.status === 'pendente_confirmacao') {
    await query(`UPDATE usuarios SET status = 'ativo' WHERE id = :id`, { id: user.id });
    user.status = 'ativo';
  }

  const papeis = await listPapeisByUsuario(user.id);
  const papel = pickDefaultPapel(papeis) || {
    id: null,
    perfil_id: Number(user.perfil_id),
    paciente_id: null,
    rotulo: user.perfil_nome,
    perfil_nome: user.perfil_nome,
  };

  const menus = await getMenusByPerfil(papel.perfil_id);
  const session = buildSessionPayload(user, papel, menus);
  session.papeis = papeis;

  await writeAudit({
    usuarioId: user.id,
    acao: 'login_sucesso',
    recurso: 'auth',
    ip,
    userAgent,
    metadados: { perfil_id: papel.perfil_id, papel_id: papel.id },
  });

  return session;
}

async function switchContext({ usuarioId, papelId, perfilId, pacienteId, ip, userAgent }) {
  const users = await query(
    `SELECT u.id, u.nome, u.email, u.status, u.perfil_id,
            COALESCE(u.onboarding_concluido, TRUE) AS onboarding_concluido,
            u.telefone, u.cpf, u.data_nascimento
     FROM usuarios u
     WHERE u.id = :id AND u.status = 'ativo'
     LIMIT 1`,
    { id: usuarioId }
  );
  const user = users[0];
  if (!user) {
    const err = new Error('Usuário inválido.');
    err.status = 401;
    throw err;
  }

  const papel = await resolvePapel(usuarioId, { papelId, perfilId, pacienteId });
  if (!papel) {
    const err = new Error('Papel não disponível para este usuário.');
    err.status = 403;
    err.code = 'forbidden';
    throw err;
  }

  // Mantém dual-read: sincroniza perfil_id legado com o contexto ativo
  await query(`UPDATE usuarios SET perfil_id = :perfilId WHERE id = :id`, {
    perfilId: papel.perfil_id,
    id: usuarioId,
  });

  const menus = await getMenusByPerfil(papel.perfil_id);
  const papeis = await listPapeisByUsuario(usuarioId);
  const session = buildSessionPayload(user, papel, menus);
  session.papeis = papeis;

  await writeAudit({
    usuarioId,
    acao: 'troca_contexto',
    recurso: 'auth',
    ip,
    userAgent,
    metadados: {
      perfil_id: papel.perfil_id,
      papel_id: papel.id,
      paciente_id: papel.paciente_id,
    },
  });

  return session;
}

module.exports = { login, switchContext, listPapeisByUsuario };
