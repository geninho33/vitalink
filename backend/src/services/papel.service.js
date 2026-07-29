const { query } = require('../config/database');

/**
 * Lista papéis ativos do usuário (multi-perfil).
 */
async function listPapeisByUsuario(usuarioId) {
  const rows = await query(
    `SELECT up.id, up.perfil_id, up.paciente_id, up.rotulo, up.is_default, up.ativo,
            p.nome AS perfil_nome,
            pac.nome AS paciente_nome
     FROM usuario_perfis up
     INNER JOIN perfis p ON p.id = up.perfil_id
     LEFT JOIN pacientes pac ON pac.id = up.paciente_id
     WHERE up.usuario_id = :usuarioId
       AND up.ativo = TRUE
     ORDER BY up.is_default DESC, p.id ASC, up.id ASC`,
    { usuarioId }
  );

  // Fallback legado se tabela vazia (pré-migração)
  if (!rows.length) {
    const legacy = await query(
      `SELECT u.perfil_id, p.nome AS perfil_nome
       FROM usuarios u
       INNER JOIN perfis p ON p.id = u.perfil_id
       WHERE u.id = :usuarioId
       LIMIT 1`,
      { usuarioId }
    );
    if (legacy[0]) {
      return [
        {
          id: null,
          perfil_id: Number(legacy[0].perfil_id),
          paciente_id: null,
          rotulo: legacy[0].perfil_nome,
          is_default: true,
          ativo: true,
          perfil_nome: legacy[0].perfil_nome,
          paciente_nome: null,
        },
      ];
    }
  }

  return rows.map((r) => ({
    id: r.id != null ? Number(r.id) : null,
    perfil_id: Number(r.perfil_id),
    paciente_id: r.paciente_id != null ? Number(r.paciente_id) : null,
    rotulo: r.rotulo || r.perfil_nome,
    is_default: Boolean(r.is_default),
    ativo: Boolean(r.ativo),
    perfil_nome: r.perfil_nome,
    paciente_nome: r.paciente_nome || null,
  }));
}

function pickDefaultPapel(papeis) {
  if (!papeis?.length) return null;
  const ranked = [...papeis].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    // Admin primeiro
    if (a.perfil_id === 1) return -1;
    if (b.perfil_id === 1) return 1;
    return a.perfil_id - b.perfil_id;
  });
  return ranked[0];
}

async function getPapelById(usuarioId, papelId) {
  const rows = await query(
    `SELECT up.id, up.perfil_id, up.paciente_id, up.rotulo, up.is_default,
            p.nome AS perfil_nome, pac.nome AS paciente_nome
     FROM usuario_perfis up
     INNER JOIN perfis p ON p.id = up.perfil_id
     LEFT JOIN pacientes pac ON pac.id = up.paciente_id
     WHERE up.id = :papelId
       AND up.usuario_id = :usuarioId
       AND up.ativo = TRUE
     LIMIT 1`,
    { papelId, usuarioId }
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    perfil_id: Number(r.perfil_id),
    paciente_id: r.paciente_id != null ? Number(r.paciente_id) : null,
    rotulo: r.rotulo || r.perfil_nome,
    is_default: Boolean(r.is_default),
    perfil_nome: r.perfil_nome,
    paciente_nome: r.paciente_nome || null,
  };
}

async function resolvePapel(usuarioId, { papelId, perfilId, pacienteId } = {}) {
  const papeis = await listPapeisByUsuario(usuarioId);
  if (papelId) {
    const found = papeis.find((p) => Number(p.id) === Number(papelId));
    if (found) return found;
    const byId = await getPapelById(usuarioId, papelId);
    if (byId) return byId;
  }
  if (perfilId != null) {
    const found = papeis.find(
      (p) =>
        Number(p.perfil_id) === Number(perfilId) &&
        (pacienteId == null
          ? p.paciente_id == null
          : Number(p.paciente_id) === Number(pacienteId))
    );
    if (found) return found;
  }
  return pickDefaultPapel(papeis);
}

/**
 * Garante linha em usuario_perfis ao criar/atualizar usuário (legado).
 */
async function syncUsuarioPerfilPadrao(usuarioId, perfilId) {
  if (!usuarioId || !perfilId) return;

  const existing = await query(
    `SELECT id FROM usuario_perfis
     WHERE usuario_id = :usuarioId AND perfil_id = :perfilId AND paciente_id IS NULL
     LIMIT 1`,
    { usuarioId, perfilId }
  );

  if (!existing[0]) {
    await query(
      `INSERT INTO usuario_perfis (usuario_id, perfil_id, paciente_id, rotulo, ativo, is_default)
       SELECT :usuarioId, :perfilId, NULL, p.nome, TRUE, TRUE
       FROM perfis p WHERE p.id = :perfilId`,
      { usuarioId, perfilId }
    );
  }

  await query(
    `UPDATE usuario_perfis SET is_default = FALSE
     WHERE usuario_id = :usuarioId AND paciente_id IS NULL`,
    { usuarioId }
  );
  await query(
    `UPDATE usuario_perfis SET is_default = TRUE, ativo = TRUE
     WHERE usuario_id = :usuarioId AND perfil_id = :perfilId AND paciente_id IS NULL`,
    { usuarioId, perfilId }
  );
}

module.exports = {
  listPapeisByUsuario,
  pickDefaultPapel,
  getPapelById,
  resolvePapel,
  syncUsuarioPerfilPadrao,
};
