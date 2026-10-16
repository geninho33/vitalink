const crypto = require('crypto');
const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { validationError } = require('../utils/validation');
const { comparePassword } = require('../utils/password');
const lgpdDados = require('../services/lgpdDados.service');

function sha256(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

const { documentosVigentes, pendentesDoUsuario } = require('../services/lgpdDocs.service');

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
       ON CONFLICT (usuario_id, documento_id) DO UPDATE
         SET revogado_em = NULL, aceito_em = NOW(), ip = EXCLUDED.ip, user_agent = EXCLUDED.user_agent,
             hash_conteudo = EXCLUDED.hash_conteudo
         WHERE lgpd_consentimentos.revogado_em IS NOT NULL
       RETURNING id`,
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
      `SELECT c.id, c.documento_id, d.tipo, d.titulo, c.versao, c.aceito_em, c.revogado_em, c.hash_conteudo
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


const auditBase = (req) => ({ usuarioId: req.user.id, ip: req.ip, userAgent: req.get('user-agent') });

/** Revoga o consentimento de dados de saúde (art. 8º, §5º). O app volta a bloquear como no aceite inicial. */
async function revogar(req, res, next) {
  try {
    const tipo = String(req.body?.tipo || 'consentimento_dados_saude');
    if (tipo !== 'consentimento_dados_saude') {
      validationError('Só o consentimento para dados de saúde pode ser revogado. Para deixar de usar o app, peça a exclusão da conta.');
    }
    const r = await query(
      `UPDATE lgpd_consentimentos c SET revogado_em = NOW()
       FROM lgpd_documentos d
       WHERE d.id = c.documento_id AND d.tipo = :tipo AND c.usuario_id = :uid AND c.revogado_em IS NULL`,
      { tipo, uid: req.user.id }
    );
    await writeAudit({ ...auditBase(req), acao: 'lgpd_revogacao', recurso: 'lgpd_documentos', metadados: { tipo, registros: r.rowCount } });
    return res.json({ ok: true, revogados: r.rowCount });
  } catch (err) {
    return next(err);
  }
}

async function exportar(req, res, next) {
  try {
    const formato = String(req.query.formato || 'json');
    if (!['json', 'zip'].includes(formato)) validationError('Formato inválido. Use json ou zip.');
    const dados = await lgpdDados.coletarExportacao(Number(req.user.id));
    await writeAudit({
      ...auditBase(req),
      acao: 'lgpd_exportacao',
      recurso: 'usuarios',
      recursoId: req.user.id,
      metadados: { formato, pacientes: dados.meta.pacientes_gerenciados },
    });
    const dia = new Date().toISOString().slice(0, 10);
    res.set({ 'Cache-Control': 'no-store, private' });
    if (formato === 'zip') {
      const zip = lgpdDados.montarZip(dados);
      res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="vitalink-meus-dados-${dia}.zip"` });
      return res.end(zip);
    }
    res.set({ 'Content-Disposition': `attachment; filename="vitalink-meus-dados-${dia}.json"` });
    return res.type('application/json').send(JSON.stringify(dados, null, 2));
  } catch (err) {
    return next(err);
  }
}

async function pedidoAtual(uid) {
  const [p] = await query(
    `SELECT id, status, solicitado_em, efetivar_em, cancelado_em FROM lgpd_exclusoes
     WHERE usuario_id = :uid AND status IN ('agendada', 'executando') ORDER BY id DESC LIMIT 1`,
    { uid }
  );
  return p || null;
}

async function exclusaoStatus(req, res, next) {
  try {
    const uid = Number(req.user.id);
    return res.json({
      data: {
        pedido: await pedidoAtual(uid),
        carencia_dias: Math.round(lgpdDados.CARENCIA_MIN / 1440),
        plano: await lgpdDados.planoExclusao(uid),
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function solicitarExclusao(req, res, next) {
  try {
    const uid = Number(req.user.id);
    const b = req.body || {};
    if (b.confirmo !== true) validationError('Confirme que entendeu as consequências da exclusão.');
    if (!b.senha) validationError('Digite sua senha para confirmar.');
    const [u] = await query('SELECT senha_hash FROM usuarios WHERE id = :uid', { uid });
    const ok = u?.senha_hash ? await comparePassword(String(b.senha), u.senha_hash).catch(() => false) : false;
    if (!ok) {
      await writeAudit({ ...auditBase(req), acao: 'lgpd_exclusao_senha_incorreta', recurso: 'lgpd_exclusoes' });
      const err = new Error('Senha incorreta.');
      err.status = 403;
      err.code = 'senha_incorreta';
      throw err;
    }
    if (await pedidoAtual(uid)) {
      const err = new Error('Já existe um pedido de exclusão agendado.');
      err.status = 409;
      err.code = 'conflict';
      throw err;
    }
    const plano = await lgpdDados.planoExclusao(uid);
    const r = await query(
      `INSERT INTO lgpd_exclusoes (usuario_id, efetivar_em) VALUES (:uid, NOW() + make_interval(mins => :min))
       RETURNING id, efetivar_em`,
      { uid, min: lgpdDados.CARENCIA_MIN }
    );
    const row = r.rows[0];
    await writeAudit({
      ...auditBase(req),
      acao: 'lgpd_exclusao_solicitada',
      recurso: 'lgpd_exclusoes',
      recursoId: row.id,
      metadados: { efetivar_em: row.efetivar_em, plano: plano.map((p) => ({ paciente_id: p.paciente_id, acao: p.acao })) },
    });
    return res.status(201).json({ data: { id: row.id, efetivar_em: row.efetivar_em, plano } });
  } catch (err) {
    return next(err);
  }
}

async function cancelarExclusao(req, res, next) {
  try {
    const uid = Number(req.user.id);
    const r = await query(
      `UPDATE lgpd_exclusoes SET status = 'cancelada', cancelado_em = NOW()
       WHERE usuario_id = :uid AND status = 'agendada' RETURNING id`,
      { uid }
    );
    if (!r.rows?.length) {
      const err = new Error('Não há pedido de exclusão para cancelar.');
      err.status = 404;
      err.code = 'not_found';
      throw err;
    }
    await writeAudit({ ...auditBase(req), acao: 'lgpd_exclusao_cancelada', recurso: 'lgpd_exclusoes', recursoId: r.rows[0].id });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listDocumentos,
  pendentes,
  aceitar,
  meusConsentimentos,
  pendentesDoUsuario,
  revogar,
  exportar,
  exclusaoStatus,
  solicitarExclusao,
  cancelarExclusao,
};
