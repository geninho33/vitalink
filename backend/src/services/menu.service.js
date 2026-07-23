const { query } = require('../config/database');

async function getMenusByPerfil(perfilId) {
  const rows = await query(
    `SELECT m.id, m.titulo, m.rota, m.icone, m.ordem, m.menu_pai_id,
            pa.pode_ler, pa.pode_criar, pa.pode_editar, pa.pode_deletar
     FROM permissoes_acesso pa
     INNER JOIN menus m ON m.id = pa.menu_id
     WHERE pa.perfil_id = :perfilId
       AND pa.pode_ler = 1
       AND m.ativo = 1
     ORDER BY m.ordem ASC, m.id ASC`,
    { perfilId }
  );

  return rows.map((row) => ({
    id: row.id,
    titulo: row.titulo,
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
