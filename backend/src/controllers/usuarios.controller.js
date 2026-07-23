const { query } = require('../config/database');
const { hashPassword } = require('../utils/password');
const { writeAudit } = require('../services/audit.service');

function clientMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function listUsuarios(req, res, next) {
  try {
    const rows = await query(
      `SELECT u.id, u.nome, u.email, u.status, u.perfil_id, p.nome AS perfil_nome,
              u.created_at, u.updated_at
       FROM usuarios u
       INNER JOIN perfis p ON p.id = u.perfil_id
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

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
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

    const fields = [];
    const params = { id };

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
      fields.push('perfil_id = :perfil_id');
      params.perfil_id = perfil_id;
    }
    if (senha) {
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

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'usuarios',
      recursoId: id,
      ...clientMeta(req),
    });

    return res.json({ ok: true });
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
