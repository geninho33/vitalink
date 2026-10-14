const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { assertPacienteAccess } = require('../services/pacienteScope.service');
const { validationError } = require('../utils/validation');

// Faixas plausíveis (registro, não diagnóstico). Espelham os CHECKs do banco.
const TIPOS = {
  frequencia_cardiaca: { unidade: 'bpm', min: 20, max: 250, label: 'Frequência cardíaca' },
  glicemia: { unidade: 'mg/dL', min: 20, max: 600, label: 'Glicemia' },
  temperatura: { unidade: '°C', min: 30, max: 45, label: 'Temperatura' },
  saturacao_o2: { unidade: '%', min: 50, max: 100, label: 'Saturação O2' },
  peso: { unidade: 'kg', min: 0.5, max: 400, label: 'Peso' },
};

function num(v) {
  if (v === null || v === undefined || v === '') return NaN;
  return Number(String(v).replace(',', '.'));
}

function parseLeitura(b) {
  const tipo = String(b.tipo || '').trim();
  const out = { tipo, valor: null, sistolica: null, diastolica: null };
  if (tipo === 'pressao') {
    const s = num(b.sistolica);
    const d = num(b.diastolica);
    if (!Number.isInteger(s) || s < 50 || s > 260) validationError('Pressão sistólica deve estar entre 50 e 260 mmHg.');
    if (!Number.isInteger(d) || d < 30 || d > 160) validationError('Pressão diastólica deve estar entre 30 e 160 mmHg.');
    if (s <= d) validationError('A sistólica deve ser maior que a diastólica.');
    return { ...out, sistolica: s, diastolica: d, unidade: 'mmHg' };
  }
  const cfg = TIPOS[tipo];
  if (!cfg) validationError('Tipo de sinal vital inválido.');
  const v = num(b.valor);
  if (!Number.isFinite(v) || v < cfg.min || v > cfg.max) {
    validationError(`${cfg.label} deve estar entre ${cfg.min} e ${cfg.max} ${cfg.unidade}.`);
  }
  return { ...out, valor: Math.round(v * 100) / 100, unidade: cfg.unidade };
}

function parseMedidoEm(v) {
  if (v == null || v === '') return new Date();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) validationError('Data/hora da medição inválida.');
  if (d.getTime() > Date.now() + 5 * 60 * 1000) validationError('A medição não pode estar no futuro.');
  if (d.getFullYear() < 1900) validationError('Data/hora da medição inválida.');
  return d;
}

async function list(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await assertPacienteAccess(req.user, pacienteId);
    const params = { pacienteId, limit: Math.min(Math.max(Number(req.query.limit) || 100, 1), 500) };
    let where = 'sv.paciente_id = :pacienteId';
    if (req.query.tipo) {
      params.tipo = String(req.query.tipo);
      where += ' AND sv.tipo = :tipo';
    }
    const rows = await query(
      `SELECT sv.id, sv.paciente_id, sv.tipo, sv.valor, sv.sistolica, sv.diastolica, sv.unidade,
              sv.medido_em, sv.origem, sv.observacao, sv.registrado_por, sv.created_at,
              u.nome AS registrado_por_nome
       FROM sinais_vitais sv
       LEFT JOIN usuarios u ON u.id = sv.registrado_por
       WHERE ${where}
       ORDER BY sv.medido_em DESC, sv.id DESC
       LIMIT :limit`,
      params
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
    if (!pacienteId) validationError('Informe o paciente.');
    const leitura = parseLeitura(b);
    const medidoEm = parseMedidoEm(b.medido_em);
    const observacao = b.observacao ? String(b.observacao).trim().slice(0, 500) : null;
    await assertPacienteAccess(req.user, pacienteId);
    const result = await query(
      `INSERT INTO sinais_vitais
        (paciente_id, tipo, valor, sistolica, diastolica, unidade, medido_em, origem, observacao, registrado_por)
       VALUES
        (:pacienteId, :tipo, :valor, :sistolica, :diastolica, :unidade, :medidoEm, 'manual', :observacao, :uid)`,
      { pacienteId, ...leitura, medidoEm, observacao, uid: req.user.id }
    );
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'sinais_vitais',
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
    if (!id) validationError('Registro inválido.');
    const rows = await query(`SELECT paciente_id FROM sinais_vitais WHERE id = :id LIMIT 1`, { id });
    if (!rows[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Registro não encontrado.' });
    }
    await assertPacienteAccess(req.user, rows[0].paciente_id);
    await query(`DELETE FROM sinais_vitais WHERE id = :id`, { id });
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'excluir',
      recurso: 'sinais_vitais',
      recursoId: id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, remove };
