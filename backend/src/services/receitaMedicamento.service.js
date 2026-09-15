const { query } = require('../config/database');

async function syncReceitaMedicamento(remedioId, { arquivoId, pacienteId, nomeComercial } = {}) {
  const arquivo = Number(arquivoId);
  const paciente = Number(pacienteId);
  const medId = Number(remedioId);
  if (!arquivo || !paciente || !medId) return null;

  const titulo = `Receita — ${String(nomeComercial || 'Medicamento').trim()}`.slice(0, 180);
  const existing = await query(
    `SELECT id FROM exames_receitas
     WHERE remedio_id = :medId AND tipo = 'receita'
     ORDER BY id DESC
     LIMIT 1`,
    { medId }
  );

  if (existing[0]) {
    await query(
      `UPDATE exames_receitas SET
         arquivo_id = :arquivo,
         titulo = :titulo,
         especialidade = 'Medicamentos',
         data_documento = CURRENT_DATE,
         observacoes = COALESCE(observacoes, 'Anexada no cadastro de medicamentos.')
       WHERE id = :id`,
      { arquivo, titulo, id: existing[0].id }
    );
    return existing[0].id;
  }

  const result = await query(
    `INSERT INTO exames_receitas
      (paciente_id, especialidade, tipo, titulo, data_documento, arquivo_id, remedio_id, observacoes)
     VALUES
      (:paciente, 'Medicamentos', 'receita', :titulo, CURRENT_DATE, :arquivo, :medId,
       'Anexada no cadastro de medicamentos.')`,
    { paciente, titulo, arquivo, medId }
  );
  return result.insertId || null;
}

module.exports = { syncReceitaMedicamento };
