const crypto = require('crypto');
const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { validationError } = require('../utils/validation');

function sha256(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

// Versão vigente (ativa, já em vigor, mais recente) de cada tipo de documento.
const VIGENTES_SQL = `
  SELECT DISTINCT ON (d.tipo) d.id, d.tipo, d.versao, d.titulo, d.conteudo, d.obrigatorio, d.vigente_desde
  FROM lgpd_documentos d
  WHERE d.ativo = TRUE AND d.vigente_desde <= NOW()
  ORDER BY d.tipo, d.vigente_desde DESC, d.id DESC`;

async function documentosVigentes() {
  return query(VIGENTES_SQL);
}

async function pendentesDoUsuario(usuarioId) {
  return query(
    `SELECT v.* FROM (${VIGENTES_SQL}) v
     WHERE v.obrigatorio = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM lgpd_consentimentos c
         WHERE c.usuario_id = :uid AND c.documento_id = v.id
       )
     ORDER BY CASE v.tipo
       WHEN 'termos_uso' THEN 1 WHEN 'politica_privacidade' THEN 2 ELSE 3 END`,
    { uid: usuarioId }
  );
}

async function listDocumentos(_req, res, next) {
  try {
    const rows = await documentosVigentes();
    return res.json({ data: rows.map((r) => ({ ...r, hash: sha256(r.conteudo) })) });
  } catch (err) {
    return next(err);
  }
}

async function pendentes(req, res, next) {
  try {
    const rows = await pendentesDoUsuario(req.user.id);
    return res.json({ pendente: rows.length > 0, data: rows });
  } catch (err) {
    return next(err);
  }
}

async function aceitar(req, res, next) {
  try {
    const b = req.body || {};
    const documentoId = Number(b.documento_id);
    if (!documentoId) validationError('Informe o documento.');
    if (b.aceito !== true) validationError('É necessário marcar a caixa de aceite.');
    const vigentes = await documentosVigentes();
    const doc = vigentes.find((d) => Number(d.id) === documentoId);
    if (!doc) validationError('Documento inexistente ou não vigente.');
    const hash = sha256(doc.conteudo);
    // Se o cliente informou o hash do texto exibido, ele precisa bater com o texto vigente.
    if (b.hash && String(b.hash) !== hash) {
      validationError('O texto do documento mudou. Recarregue a página e leia a versão atual.');
    }
    const ins = await query(
      `INSERT INTO lgpd_consentimentos (usuario_id, documento_id, versao, ip, user_agent, hash_conteudo)
       VALUES (:uid, :docId, :versao, :ip, :ua, :hash)
       ON CONFLICT (usuario_id, documento_id) DO NOTHING`,
      {
        uid: req.user.id,
        docId: documentoId,
        versao: doc.versao,
        ip: String(req.ip || '').slice(0, 64) || null,
        ua: String(req.get('user-agent') || '').slice(0, 500) || null,
        hash,
      }
    );
    if (!ins.rowCount) {
      return res.status(200).json({ ok: true, ja_aceito: true });
    }
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'lgpd_aceite',
      recurso: 'lgpd_documentos',
      recursoId: documentoId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: { tipo: doc.tipo, versao: doc.versao, hash },
    });
    return res.status(201).json({ ok: true, id: ins.insertId, ja_aceito: false });
  } catch (err) {
    return next(err);
  }
}

async function meusConsentimentos(req, res, next) {
  try {
    const rows = await query(
      `SELECT c.id, c.documento_id, d.tipo, d.titulo, c.versao, c.aceito_em, c.hash_conteudo
       FROM lgpd_consentimentos c
       JOIN lgpd_documentos d ON d.id = c.documento_id
       WHERE c.usuario_id = :uid
       ORDER BY c.aceito_em DESC`,
      { uid: req.user.id }
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listDocumentos, pendentes, aceitar, meusConsentimentos, pendentesDoUsuario };
