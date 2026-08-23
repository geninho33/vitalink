const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { assertPacienteAccess } = require('../services/pacienteScope.service');
const { validationError } = require('../utils/validation');

async function list(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await assertPacienteAccess(req.user, pacienteId);
    const rows = await query(
      `SELECT * FROM paciente_corpo_marcas
       WHERE paciente_id = :pacienteId
       ORDER BY created_at DESC, id DESC`,
      { pacienteId }
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const b = req.body || {};
    const pacienteId = Number(b.paciente_id);
    const posX = Number(b.pos_x);
    const posY = Number(b.pos_y);
    const titulo = String(b.titulo || '').trim();
    if (!pacienteId) validationError('Informe o paciente.');
    if (!titulo) validationError('Informe o nome da doença ou sintoma.');
    if (!Number.isFinite(posX) || !Number.isFinite(posY)) {
      validationError('Informe o ponto no mapa corporal.');
    }
    await assertPacienteAccess(req.user, pacienteId);
    const result = await query(
      `INSERT INTO paciente_corpo_marcas (paciente_id, pos_x, pos_y, titulo, descricao)
       VALUES (:pacienteId, :posX, :posY, :titulo, :descricao)`,
      {
        pacienteId,
        posX,
        posY,
        titulo,
        descricao: b.descricao ? String(b.descricao).trim() : null,
      }
    );
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'paciente_corpo_marcas',
      recursoId: result.insertId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const rows = await query(
      `SELECT paciente_id FROM paciente_corpo_marcas WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Marca não encontrada.' });
    }
    await assertPacienteAccess(req.user, rows[0].paciente_id);
    await query(`DELETE FROM paciente_corpo_marcas WHERE id = :id`, { id });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, remove };
