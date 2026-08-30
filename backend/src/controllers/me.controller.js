const { query } = require('../config/database');
const {
  listAllowedPacienteIds,
  assertPacienteAccess,
} = require('../services/pacienteScope.service');
const { parseIsoDate, isValidEmail } = require('../utils/validation');
const { pick } = require('../utils/crudFactory');
const { writeAudit, buildAuditDiff } = require('../services/audit.service');

const PACIENTE_SELF_FIELDS = [
  'nome',
  'email',
  'sexo',
  'data_nascimento',
  'tipo_sanguineo',
  'telefone_principal',
  'alergias',
  'observacoes',
  'diagnostico_principal',
];

async function resolveOwnPacienteId(user) {
  const ids = await listAllowedPacienteIds(user);
  const fromToken = user.pacienteId != null ? Number(user.pacienteId) : null;
  if (fromToken && (ids === null || ids.includes(fromToken))) return fromToken;
  if (ids && ids.length) return ids[0];
  return null;
}

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

async function getMeuPaciente(req, res, next) {
  try {
    const pacienteId = await resolveOwnPacienteId(req.user);
    if (!pacienteId) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Nenhum paciente vinculado ao seu usuário.',
      });
    }
    await assertPacienteAccess(req.user, pacienteId);
    const rows = await query(
      `SELECT p.*
       FROM pacientes p
       WHERE p.id = :id
       LIMIT 1`,
      { id: pacienteId }
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Registro não encontrado.' });
    }
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function updateMeuPaciente(req, res, next) {
  try {
    const pacienteId = await resolveOwnPacienteId(req.user);
    if (!pacienteId) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Nenhum paciente vinculado ao seu usuário.',
      });
    }
    await assertPacienteAccess(req.user, pacienteId);

    const payload = pick(req.body || {}, PACIENTE_SELF_FIELDS);
    if (payload.data_nascimento) {
      payload.data_nascimento = parseIsoDate(payload.data_nascimento) || payload.data_nascimento;
    }
    if (payload.email === '') payload.email = null;
    if (payload.email && !isValidEmail(payload.email)) {
      return res.status(400).json({ error: 'validation_error', message: 'E-mail inválido.' });
    }
    if (payload.sexo === '') payload.sexo = null;
    if (payload.alergias === '') payload.alergias = null;
    if (payload.observacoes === '') payload.observacoes = null;
    if (payload.diagnostico_principal === '') payload.diagnostico_principal = null;
    if (payload.telefone_principal === '') payload.telefone_principal = null;
    if (!payload.tipo_sanguineo) payload.tipo_sanguineo = 'NI';

    const cols = Object.keys(payload).filter((k) => payload[k] !== undefined);
    if (!cols.length) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Nenhum campo para atualizar.',
      });
    }

    const beforeRows = await query(`SELECT * FROM pacientes WHERE id = :id LIMIT 1`, {
      id: pacienteId,
    });
    const before = beforeRows[0];
    if (!before) {
      return res.status(404).json({ error: 'not_found', message: 'Registro não encontrado.' });
    }

    const sets = cols.map((c) => `${c} = :${c}`).join(', ');
    await query(`UPDATE pacientes SET ${sets} WHERE id = :id`, {
      ...payload,
      id: pacienteId,
    });

    const diff = buildAuditDiff(before, { ...before, ...payload }, cols);
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'pacientes',
      recursoId: pacienteId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: diff ? { diff, origem: 'me_paciente' } : { origem: 'me_paciente' },
    });

    const after = await query(`SELECT * FROM pacientes WHERE id = :id LIMIT 1`, {
      id: pacienteId,
    });
    return res.json({ ok: true, data: after[0] || { ...before, ...payload } });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listMeusPacientes, getMeuPaciente, updateMeuPaciente };
