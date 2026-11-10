const { query } = require('../config/database');

/** Resolve farmácia por id ou cria/reusa a partir de um nome livre. */
async function resolverFarmaciaId(req, b = {}) {
  const id = Number(b.farmacia_id);
  if (Number.isInteger(id) && id > 0) return id;
  const nome = String(b.farmacia_nome || b.farmacia_label || b.nome_fantasia || '').trim();
  if (!nome) return null;
  const existing = await query(
    `SELECT id FROM farmacias
     WHERE lower(nome_fantasia) = lower(:nome)
       AND (usuario_id = :uid OR usuario_id IS NULL)
     ORDER BY id
     LIMIT 1`,
    { nome, uid: req.user.id }
  );
  if (existing[0]) return Number(existing[0].id);
  const created = await query(
    `INSERT INTO farmacias
      (nome_fantasia, telefone_principal, cep, logradouro, numero, bairro, cidade, uf, status, usuario_id)
     VALUES
      (:nome, '00000000000', '00000000', 'A definir', 's/n', 'A definir', 'A definir', 'SP', 'ativo', :uid)`,
    { nome, uid: req.user.id }
  );
  return created.insertId;
}

module.exports = { resolverFarmaciaId };
