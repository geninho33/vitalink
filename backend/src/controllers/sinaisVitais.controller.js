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
    const params = { pacienteId, limit: Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000) };
    let where = 'sv.paciente_id = :pacienteId';
    if (req.query.tipo) {
      params.tipo = String(req.query.tipo);
      where += ' AND sv.tipo = :tipo';
    }
    let desdeSql = '';
    const dias = Number(req.query.dias);
    if (Number.isFinite(dias) && dias > 0) {
      params.dias = Math.min(Math.floor(dias), 3650);
      desdeSql = " AND sv.medido_em >= NOW() - (:dias * INTERVAL '1 day')";
    }
    const rows = await query(
      `SELECT sv.id, sv.paciente_id, sv.tipo, sv.valor, sv.sistolica, sv.diastolica, sv.unidade,
              sv.medido_em, sv.origem, sv.observacao, sv.registrado_por, sv.created_at,
              u.nome AS registrado_por_nome,
              CASE
                WHEN f.id IS NULL THEN NULL
                WHEN sv.tipo = 'pressao' THEN (
                  (f.sistolica_min IS NOT NULL AND sv.sistolica < f.sistolica_min)
                  OR (f.sistolica_max IS NOT NULL AND sv.sistolica > f.sistolica_max)
                  OR (f.diastolica_min IS NOT NULL AND sv.diastolica < f.diastolica_min)
                  OR (f.diastolica_max IS NOT NULL AND sv.diastolica > f.diastolica_max))
                ELSE (
                  (f.valor_min IS NOT NULL AND sv.valor < f.valor_min)
                  OR (f.valor_max IS NOT NULL AND sv.valor > f.valor_max))
              END AS fora_da_faixa
       FROM sinais_vitais sv
       LEFT JOIN usuarios u ON u.id = sv.registrado_por
       LEFT JOIN sinais_vitais_faixas f ON f.paciente_id = sv.paciente_id AND f.tipo = sv.tipo
       WHERE ${where}${desdeSql}
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

// ---- Faixas definidas pela família ou pelo médico (sem diagnóstico) ----

const LIMITES_PRESSAO = { sistolica: [50, 260], diastolica: [30, 160] };

function lerLimite(v, [lo, hi], nome, inteiro) {
  if (v === null || v === undefined || v === '') return null;
  const n = num(v);
  if (!Number.isFinite(n) || (inteiro && !Number.isInteger(n)) || n < lo || n > hi) {
    validationError(`${nome} deve estar entre ${lo} e ${hi}.`);
  }
  return n;
}

function parseFaixa(b) {
  const tipo = String(b.tipo || '').trim();
  const f = {
    tipo,
    valor_min: null,
    valor_max: null,
    sistolica_min: null,
    sistolica_max: null,
    diastolica_min: null,
    diastolica_max: null,
  };
  if (tipo === 'pressao') {
    f.sistolica_min = lerLimite(b.sistolica_min, LIMITES_PRESSAO.sistolica, 'Sistólica mínima', true);
    f.sistolica_max = lerLimite(b.sistolica_max, LIMITES_PRESSAO.sistolica, 'Sistólica máxima', true);
    f.diastolica_min = lerLimite(b.diastolica_min, LIMITES_PRESSAO.diastolica, 'Diastólica mínima', true);
    f.diastolica_max = lerLimite(b.diastolica_max, LIMITES_PRESSAO.diastolica, 'Diastólica máxima', true);
    if ([f.sistolica_min, f.sistolica_max, f.diastolica_min, f.diastolica_max].every((x) => x == null)) {
      validationError('Informe ao menos um limite.');
    }
    if (f.sistolica_min != null && f.sistolica_max != null && f.sistolica_min >= f.sistolica_max) {
      validationError('A sistólica mínima deve ser menor que a máxima.');
    }
    if (f.diastolica_min != null && f.diastolica_max != null && f.diastolica_min >= f.diastolica_max) {
      validationError('A diastólica mínima deve ser menor que a máxima.');
    }
    return f;
  }
  const cfg = TIPOS[tipo];
  if (!cfg) validationError('Tipo de sinal vital inválido.');
  f.valor_min = lerLimite(b.valor_min, [cfg.min, cfg.max], 'Limite mínimo', false);
  f.valor_max = lerLimite(b.valor_max, [cfg.min, cfg.max], 'Limite máximo', false);
  if (f.valor_min == null && f.valor_max == null) validationError('Informe ao menos um limite.');
  if (f.valor_min != null && f.valor_max != null && f.valor_min >= f.valor_max) {
    validationError('O limite mínimo deve ser menor que o máximo.');
  }
  return f;
}

async function listFaixas(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await assertPacienteAccess(req.user, pacienteId);
    const rows = await query(
      `SELECT f.*, u.nome AS definido_por_nome
       FROM sinais_vitais_faixas f
       LEFT JOIN usuarios u ON u.id = f.definido_por
       WHERE f.paciente_id = :pacienteId
       ORDER BY f.tipo`,
      { pacienteId }
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function salvarFaixa(req, res, next) {
  try {
    const b = req.body || {};
    const pacienteId = Number(b.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    const f = parseFaixa(b);
    await assertPacienteAccess(req.user, pacienteId);
    // Origem pelo perfil ativo: médico (2) => 'medico'; demais => 'familia'.
    const origem = Number(req.user.perfilId) === 2 ? 'medico' : 'familia';
    const r = await query(
      `INSERT INTO sinais_vitais_faixas
        (paciente_id, tipo, valor_min, valor_max, sistolica_min, sistolica_max,
         diastolica_min, diastolica_max, origem, definido_por)
       VALUES (:pacienteId, :tipo, :valor_min, :valor_max, :sistolica_min, :sistolica_max,
         :diastolica_min, :diastolica_max, :origem, :uid)
       ON CONFLICT (paciente_id, tipo) DO UPDATE SET
         valor_min = EXCLUDED.valor_min, valor_max = EXCLUDED.valor_max,
         sistolica_min = EXCLUDED.sistolica_min, sistolica_max = EXCLUDED.sistolica_max,
         diastolica_min = EXCLUDED.diastolica_min, diastolica_max = EXCLUDED.diastolica_max,
         origem = EXCLUDED.origem, definido_por = EXCLUDED.definido_por, updated_at = NOW()`,
      { pacienteId, ...f, origem, uid: req.user.id }
    );
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'definir_faixa',
      recurso: 'sinais_vitais_faixas',
      recursoId: r.insertId || null,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: { paciente_id: pacienteId, ...f, origem },
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function removerFaixa(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id || req.body?.paciente_id);
    const tipo = String(req.query.tipo || req.body?.tipo || '');
    if (!pacienteId || !tipo) validationError('Informe o paciente e o tipo.');
    await assertPacienteAccess(req.user, pacienteId);
    const r = await query(
      `DELETE FROM sinais_vitais_faixas WHERE paciente_id = :pacienteId AND tipo = :tipo`,
      { pacienteId, tipo }
    );
    if (!r.rowCount) {
      return res.status(404).json({ error: 'not_found', message: 'Faixa não encontrada.' });
    }
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'remover_faixa',
      recurso: 'sinais_vitais_faixas',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: { paciente_id: pacienteId, tipo },
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, remove, listFaixas, salvarFaixa, removerFaixa };
