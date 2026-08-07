const { query, isDuplicateKey } = require('../config/database');
const { hashPassword } = require('../utils/password');
const { writeAudit } = require('../services/audit.service');
const { syncUsuarioPerfilPadrao } = require('../services/papel.service');

function clientMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

const PERFIS_RESPONSAVEL_PODE_GERIR = [4, 5, 6]; // Cuidador, Responsável, Paciente

function isResponsavel(req) {
  return Number(req.user?.perfilId) === 5;
}

async function listUsuarios(req, res, next) {
  try {
    const where = isResponsavel(req)
      ? 'WHERE u.perfil_id IN (4, 5, 6)'
      : '';
    const rows = await query(
      `SELECT u.id, u.nome, u.email, u.status, u.perfil_id, p.nome AS perfil_nome,
              u.created_at, u.updated_at
       FROM usuarios u
       INNER JOIN perfis p ON p.id = u.perfil_id
       ${where}
       ORDER BY u.nome ASC`
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function createUsuario(req, res, next) {
  try {
    const { nome, email, senha, status = 'ativo', perfil_id } = req.body || {};
    if (!nome || !email || !senha || !perfil_id) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Campos obrigatórios: nome, email, senha, perfil_id.',
      });
    }

    if (isResponsavel(req) && !PERFIS_RESPONSAVEL_PODE_GERIR.includes(Number(perfil_id))) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Responsável só pode criar usuários Cuidador, Responsável ou Paciente.',
      });
    }

    const senha_hash = await hashPassword(senha);
    const result = await query(
      `INSERT INTO usuarios (nome, email, senha_hash, status, perfil_id)
       VALUES (:nome, :email, :senha_hash, :status, :perfil_id)`,
      {
        nome,
        email: String(email).trim().toLowerCase(),
        senha_hash,
        status,
        perfil_id,
      }
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'usuarios',
      recursoId: result.insertId,
      ...clientMeta(req),
    });

    await syncUsuarioPerfilPadrao(result.insertId, Number(perfil_id));

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (isDuplicateKey(err)) {
      err.status = 409;
      err.message = 'E-mail já cadastrado.';
    }
    return next(err);
  }
}

async function updateUsuario(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, email, senha, status, perfil_id } = req.body || {};
    const targetId = Number(id);
    const isSelf = targetId === Number(req.user.id);

    // Não invalidar a própria sessão: impede auto-inativação / auto-bloqueio
    if (isSelf && status != null && String(status).toLowerCase() !== 'ativo') {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Não é permitido inativar ou bloquear o próprio usuário.',
      });
    }

    const existing = await query(
      'SELECT perfil_id FROM usuarios WHERE id = :id LIMIT 1',
      { id: targetId }
    );
    if (
      isResponsavel(req) &&
      existing[0] &&
      !PERFIS_RESPONSAVEL_PODE_GERIR.includes(Number(existing[0].perfil_id))
    ) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Não é permitido alterar usuários Administradores.',
      });
    }

    const fields = [];
    const params = { id: targetId };

    if (nome != null) {
      fields.push('nome = :nome');
      params.nome = nome;
    }
    if (email != null) {
      fields.push('email = :email');
      params.email = String(email).trim().toLowerCase();
    }
    if (status != null) {
      fields.push('status = :status');
      params.status = status;
    }
    if (perfil_id != null) {
      if (isResponsavel(req) && !PERFIS_RESPONSAVEL_PODE_GERIR.includes(Number(perfil_id))) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Responsável só pode atribuir perfis Cuidador, Responsável ou Paciente.',
        });
      }
      fields.push('perfil_id = :perfil_id');
      params.perfil_id = Number(perfil_id);
    }
    // Senha só muda se enviada com conteúdo — não regenera hash vazio
    if (senha != null && String(senha).trim() !== '') {
      fields.push('senha_hash = :senha_hash');
      params.senha_hash = await hashPassword(senha);
    }

    if (!fields.length) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Nenhum campo para atualizar.',
      });
    }

    await query(
      `UPDATE usuarios SET ${fields.join(', ')} WHERE id = :id`,
      params
    );

    if (perfil_id != null) {
      await syncUsuarioPerfilPadrao(targetId, Number(perfil_id));
    }

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'usuarios',
      recursoId: id,
      ...clientMeta(req),
    });

    // Token JWT permanece válido; cliente pode atualizar menus/dados via /menus/me
    return res.json({
      ok: true,
      sessionHint: isSelf
        ? 'Dados do usuário logado atualizados. O token atual permanece válido.'
        : undefined,
    });
  } catch (err) {
    return next(err);
  }
}

async function deleteUsuario(req, res, next) {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Não é permitido inativar o próprio usuário.',
      });
    }

    await query(`UPDATE usuarios SET status = 'inativo' WHERE id = :id`, { id });
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'inativar',
      recurso: 'usuarios',
      recursoId: id,
      ...clientMeta(req),
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function resetSenha(req, res, next) {
  try {
    const { id } = req.params;
    const { senha } = req.body || {};
    if (!senha || String(senha).length < 6) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe uma nova senha com ao menos 6 caracteres.',
      });
    }
    const senha_hash = await hashPassword(senha);
    await query(`UPDATE usuarios SET senha_hash = :senha_hash WHERE id = :id`, {
      id,
      senha_hash,
    });
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'reset_senha',
      recurso: 'usuarios',
      recursoId: id,
      ...clientMeta(req),
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  resetSenha,
};
