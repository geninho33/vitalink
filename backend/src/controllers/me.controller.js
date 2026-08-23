const { query } = require('../config/database');
const { listAllowedPacienteIds } = require('../services/pacienteScope.service');

async function listMeusPacientes(req, res, next) {
  try {
    const ids = await listAllowedPacienteIds(req.user);
    if (ids !== null && ids.length === 0) {
      return res.json({ data: [] });
    }

    const where = ids === null ? 'p.status = :status' : 'p.id = ANY(:ids) AND p.status = :status';
    const rows = await query(
      `SELECT p.id, p.nome, p.data_nascimento, p.cpf, p.status, p.foto_url,
              p.diagnostico_principal, p.tipo_sanguineo, p.sexo, p.email,
              p.telefone_principal, p.alergias, p.observacoes
       FROM pacientes p
       WHERE ${where}
       ORDER BY p.nome ASC
       LIMIT 200`,
      { ids: ids || [], status: 'ativo' }
    );

    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listMeusPacientes };
