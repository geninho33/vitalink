const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');

async function listPerfis(req, res, next) {
  try {
    const perfis = await query(
      `SELECT id, nome, descricao, created_at, updated_at FROM perfis ORDER BY nome`
    );
    const permissoes = await query(
      `SELECT pa.id, pa.perfil_id, pa.menu_id, m.titulo AS menu_titulo, m.rota,
              pa.pode_ler, pa.pode_criar, pa.pode_editar, pa.pode_deletar
       FROM permissoes_acesso pa
       INNER JOIN menus m ON m.id = pa.menu_id
       ORDER BY pa.perfil_id, m.ordem`
    );
    return res.json({ data: perfis, permissoes });
  } catch (err) {
    return next(err);
  }
}

async function createPerfil(req, res, next) {
  try {
    const { nome, descricao, permissoes = [] } = req.body || {};
    if (!nome) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Campo obrigatório: nome.',
      });
    }

    const result = await query(
      `INSERT INTO perfis (nome, descricao) VALUES (:nome, :descricao)`,
      { nome, descricao: descricao || null }
    );
    const perfilId = result.insertId;

    for (const p of permissoes) {
      await query(
        `INSERT INTO permissoes_acesso
          (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
         VALUES
          (:perfil_id, :menu_id, :pode_ler, :pode_criar, :pode_editar, :pode_deletar)`,
        {
          perfil_id: perfilId,
          menu_id: p.menu_id,
          pode_ler: p.pode_ler ? 1 : 0,
          pode_criar: p.pode_criar ? 1 : 0,
          pode_editar: p.pode_editar ? 1 : 0,
          pode_deletar: p.pode_deletar ? 1 : 0,
        }
      );
    }

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'perfis',
      recursoId: perfilId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({ id: perfilId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      err.status = 409;
      err.message = 'Perfil já existe.';
    }
    return next(err);
  }
}

async function updatePermissoes(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, descricao, permissoes } = req.body || {};

    if (nome != null || descricao != null) {
      await query(
        `UPDATE perfis
         SET nome = COALESCE(:nome, nome),
             descricao = COALESCE(:descricao, descricao)
         WHERE id = :id`,
        { id, nome: nome ?? null, descricao: descricao ?? null }
      );
    }

    if (Array.isArray(permissoes)) {
      await query(`DELETE FROM permissoes_acesso WHERE perfil_id = :id`, { id });
      for (const p of permissoes) {
        await query(
          `INSERT INTO permissoes_acesso
            (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
           VALUES
            (:perfil_id, :menu_id, :pode_ler, :pode_criar, :pode_editar, :pode_deletar)`,
          {
            perfil_id: id,
            menu_id: p.menu_id,
            pode_ler: p.pode_ler ? 1 : 0,
            pode_criar: p.pode_criar ? 1 : 0,
            pode_editar: p.pode_editar ? 1 : 0,
            pode_deletar: p.pode_deletar ? 1 : 0,
          }
        );
      }
    }

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'perfis',
      recursoId: id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listPerfis, createPerfil, updatePermissoes };
