const crypto = require('crypto');
const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { assertPacienteAccess } = require('../services/pacienteScope.service');
const relatorio = require('../services/relatorio.service');
const { podeGerenciar } = require('./convites.controller');
const { validationError } = require('../utils/validation');

const VALIDADE_PADRAO_H = 72;
const VALIDADE_MIN_H = 24;
const VALIDADE_MAX_H = 168;

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}
const hash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const auditBase = (req) => ({ usuarioId: req.user?.id || null, ip: req.ip, userAgent: req.get('user-agent') });

function nomeArquivo(nome, periodo) {
  const base = String(nome || 'paciente').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'paciente';
  return `vitalink-relatorio-${base}-${periodo.inicio}-a-${periodo.fim}.pdf`;
}

async function montar(pacienteId, periodo) {
  const dados = await relatorio.coletarDados(pacienteId, periodo);
  if (!dados) throw httpError(404, 'not_found', 'Paciente não encontrado.');
  const pdf = await relatorio.gerarPdf(dados);
  return { pdf, dados };
}

function enviarPdf(res, pdf, filename, inline) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Length': pdf.length,
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
    'Cache-Control': 'no-store, private',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
  });
  return res.end(pdf);
}

async function baixar(req, res, next) {
  try {
    const pacienteId = Number(req.params.pacienteId);
    if (!pacienteId) validationError('Informe o paciente.');
    await assertPacienteAccess(req.user, pacienteId);
    const periodo = relatorio.normalizarPeriodo(req.query.inicio, req.query.fim);
    const { pdf, dados } = await montar(pacienteId, periodo);
    await writeAudit({
      ...auditBase(req),
      acao: 'relatorio_pdf_baixado',
      recurso: 'relatorios',
      recursoId: pacienteId,
      metadados: { paciente_id: pacienteId, ...periodo },
    });
    return enviarPdf(res, pdf, nomeArquivo(dados.paciente.nome, periodo), false);
  } catch (err) {
    return next(err);
  }
}

async function exigirGestor(user, pacienteId) {
  if (!(await podeGerenciar(user, pacienteId))) {
    throw httpError(403, 'forbidden', 'Apenas o responsável pelo paciente pode criar ou gerenciar links do relatório.');
  }
}

async function criarLink(req, res, next) {
  try {
    const b = req.body || {};
    const pacienteId = Number(b.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await exigirGestor(req.user, pacienteId);
    const periodo = relatorio.normalizarPeriodo(b.inicio, b.fim);
    const horas = b.validade_horas == null ? VALIDADE_PADRAO_H : Number(b.validade_horas);
    if (!Number.isInteger(horas) || horas < VALIDADE_MIN_H || horas > VALIDADE_MAX_H) {
      validationError('A validade do link deve ser de 24 horas a 7 dias.');
    }
    const token = crypto.randomBytes(24).toString('base64url');
    const r = await query(
      `INSERT INTO relatorio_links (paciente_id, criado_por, token_hash, periodo_inicio, periodo_fim, expires_at)
       VALUES (:pid, :uid, :hash, :inicio, :fim, NOW() + make_interval(hours => :horas))
       RETURNING id, expires_at`,
      { pid: pacienteId, uid: req.user.id, hash: hash(token), ...periodo, horas }
    );
    const row = r.rows?.[0] || {};
    await writeAudit({
      ...auditBase(req),
      acao: 'relatorio_link_criado',
      recurso: 'relatorio_links',
      recursoId: row.id,
      metadados: { paciente_id: pacienteId, ...periodo, validade_horas: horas },
    });
    return res.status(201).json({ data: { id: row.id, expires_at: row.expires_at, ...periodo, token } });
  } catch (err) {
    return next(err);
  }
}

function situacao(l) {
  if (l.revogado_em) return 'revogado';
  if (new Date(l.expires_at) <= new Date()) return 'expirado';
  return 'ativo';
}

async function listarLinks(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await exigirGestor(req.user, pacienteId);
    const rows = await query(
      `SELECT l.id, l.periodo_inicio, l.periodo_fim, l.expires_at, l.revogado_em, l.visualizacoes,
              l.ultima_visualizacao_em, l.created_at, u.nome AS criado_por_nome
       FROM relatorio_links l LEFT JOIN usuarios u ON u.id = l.criado_por
       WHERE l.paciente_id = :pid ORDER BY l.created_at DESC LIMIT 50`,
      { pid: pacienteId }
    );
    return res.json({ data: rows.map((l) => ({ ...l, situacao: situacao(l) })) });
  } catch (err) {
    return next(err);
  }
}

async function revogarLink(req, res, next) {
  try {
    const id = Number(req.params.id);
    const [l] = await query('SELECT id, paciente_id, revogado_em FROM relatorio_links WHERE id = :id', { id });
    if (!l) throw httpError(404, 'not_found', 'Link não encontrado.');
    await exigirGestor(req.user, l.paciente_id);
    if (l.revogado_em) throw httpError(409, 'conflict', 'Este link já foi revogado.');
    await query('UPDATE relatorio_links SET revogado_em = NOW(), revogado_por = :uid WHERE id = :id', { id, uid: req.user.id });
    await writeAudit({
      ...auditBase(req),
      acao: 'relatorio_link_revogado',
      recurso: 'relatorio_links',
      recursoId: id,
      metadados: { paciente_id: l.paciente_id },
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

/** Link público: entrega só o PDF. Nada além do relatório do período escolhido. */
async function publico(req, res, next) {
  try {
    const token = String(req.params.token || '');
    if (token.length < 20 || token.length > 100) throw httpError(404, 'not_found', 'Link não encontrado.');
    const [l] = await query('SELECT * FROM relatorio_links WHERE token_hash = :h', { h: hash(token) });
    if (!l) throw httpError(404, 'not_found', 'Link não encontrado.');
    const sit = situacao(l);
    if (sit !== 'ativo') {
      throw httpError(410, `link_${sit}`, sit === 'revogado' ? 'Este link foi cancelado por quem o criou.' : 'Este link expirou.');
    }
    const upd = await query(
      `UPDATE relatorio_links SET visualizacoes = visualizacoes + 1, ultima_visualizacao_em = NOW()
       WHERE id = :id AND revogado_em IS NULL AND expires_at > NOW() RETURNING visualizacoes`,
      { id: l.id }
    );
    if (!upd.rows?.length) throw httpError(410, 'link_expirado', 'Este link expirou.');
    const periodo = {
      inicio: new Date(l.periodo_inicio).toISOString().slice(0, 10),
      fim: new Date(l.periodo_fim).toISOString().slice(0, 10),
    };
    const { pdf } = await montar(l.paciente_id, periodo);
    await writeAudit({
      usuarioId: null,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      acao: 'relatorio_link_visualizado',
      recurso: 'relatorio_links',
      recursoId: l.id,
      metadados: { paciente_id: l.paciente_id, visualizacoes: upd.rows[0].visualizacoes },
    });
    return enviarPdf(res, pdf, `vitalink-relatorio-${periodo.inicio}-a-${periodo.fim}.pdf`, true);
  } catch (err) {
    return next(err);
  }
}

module.exports = { baixar, criarLink, listarLinks, revogarLink, publico };
