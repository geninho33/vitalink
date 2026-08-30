const { query } = require('../config/database');

const PERFIL_AUTOCUIDADO = 7;
const AUTOCUIDADO_MENU_IDS = new Set([1, 2, 40]);

async function getMenusByPerfil(perfilId) {
  let rows = await query(
    `SELECT m.id, m.titulo, m.rota, m.icone, m.ordem, m.menu_pai_id,
            pa.pode_ler, pa.pode_criar, pa.pode_editar, pa.pode_deletar
     FROM permissoes_acesso pa
     INNER JOIN menus m ON m.id = pa.menu_id
     WHERE pa.perfil_id = :perfilId
       AND pa.pode_ler = TRUE
       AND m.ativo = TRUE
     ORDER BY m.ordem ASC, m.id ASC`,
    { perfilId }
  );

  if (Number(perfilId) === PERFIL_AUTOCUIDADO) {
    rows = rows.filter((r) => AUTOCUIDADO_MENU_IDS.has(Number(r.id)));
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const missingParents = [
    ...new Set(rows.map((r) => r.menu_pai_id).filter(Boolean)),
  ].filter((id) => !byId.has(id));

  for (const parentId of missingParents) {
    const parents = await query(
      `SELECT m.id, m.titulo, m.rota, m.icone, m.ordem, m.menu_pai_id,
              TRUE AS pode_ler, FALSE AS pode_criar, FALSE AS pode_editar, FALSE AS pode_deletar
       FROM menus m
       WHERE m.id = :id AND m.ativo = TRUE
       LIMIT 1`,
      { id: parentId }
    );
    if (parents[0] && !byId.has(parents[0].id)) {
      rows.push(parents[0]);
      byId.set(parents[0].id, parents[0]);
    }
  }

  return rows
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .map((row) => ({
      id: row.id,
      titulo:
        Number(perfilId) === PERFIL_AUTOCUIDADO && row.rota === '/inicio'
          ? 'Sua saúde'
          : row.titulo,
      rota: row.rota,
      icone: row.icone,
      ordem: row.ordem,
      menuPaiId: row.menu_pai_id,
      permissoes: {
        ler: !!row.pode_ler,
        criar: !!row.pode_criar,
        editar: !!row.pode_editar,
        deletar: !!row.pode_deletar,
      },
    }));
}

module.exports = { getMenusByPerfil };
