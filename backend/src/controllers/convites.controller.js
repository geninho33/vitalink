const crypto = require('crypto');
const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { assertPacienteAccess, PERFIL } = require('../services/pacienteScope.service');
const { linkUsuarioPaciente, ensurePapel } = require('../services/vinculoPaciente.service');
const { pendentesDoUsuario } = require('./lgpd.controller');
const { validationError } = require('../utils/validation');

const PAPEIS = {
  responsavel: { perfilId: PERFIL.RESPONSAVEL, rotulo: 'Responsável' },
  cuidador: { perfilId: PERFIL.CUIDADOR, rotulo: 'Cuidador' },
};
const PAPEIS_GESTOR = new Set(['responsavel', 'autocuidado']);
const VALIDADE_DIAS = 7;

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function auditBase(req) {
  return { usuarioId: req.user?.id || null, ip: req.ip, userAgent: req.get('user-agent') };
}

/**
 * Pode gerenciar a rede de cuidado do paciente (convidar, revogar, remover membros)?
 * Admin; responsável vinculado; o próprio paciente em autocuidado. Cuidador não.
 */
async function podeGerenciar(user, pacienteId) {
  if (!user?.id) return false;
  if (Number(user.perfilId) === PERFIL.ADMIN) return true;
  await assertPacienteAccess(user, pacienteId);
  const rows = await query(
    `SELECT 1 FROM usuario_paciente
      WHERE usuario_id = :uid AND paciente_id = :pid AND papel = ANY(:papeis)
     UNION
     SELECT 1 FROM paciente_responsaveis pr JOIN responsaveis r ON r.id = pr.responsavel_id
      WHERE pr.paciente_id = :pid AND r.usuario_id = :uid
     UNION
     SELECT 1 FROM pacientes p JOIN responsaveis r ON r.id = p.responsavel_id
      WHERE p.id = :pid AND r.usuario_id = :uid
     LIMIT 1`,
    { uid: Number(user.id), pid: Number(pacienteId), papeis: [...PAPEIS_GESTOR] }
  );
  return rows.length > 0;
}

async function exigirGestor(user, pacienteId) {
  if (!(await podeGerenciar(user, pacienteId))) {
    throw httpError(403, 'forbidden', 'Apenas o responsável pelo paciente pode gerenciar a rede de cuidado.');
  }
}

function situacao(c) {
  if (c.revogado_em) return 'revogado';
  if (c.usado_em) return 'usado';
  if (new Date(c.expires_at) <= new Date()) return 'expirado';
  return 'pendente';
}

function primeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0] || '';
}

async function criar(req, res, next) {
  try {
    const pacienteId = Number(req.body?.paciente_id);
    const papel = String(req.body?.papel || '');
    if (!pacienteId) validationError('Informe o paciente.');
    if (!PAPEIS[papel]) validationError('Papel inválido. Use responsavel ou cuidador.');
    await exigirGestor(req.user, pacienteId);
    const rotulo = req.body?.rotulo ? String(req.body.rotulo).trim().slice(0, 160) : null;
    const token = crypto.randomBytes(24).toString('base64url');
    const r = await query(
      `INSERT INTO convites (paciente_id, criado_por, papel, token_hash, rotulo, expires_at, max_usos)
       VALUES (:pid, :uid, :papel, :hash, :rotulo, NOW() + make_interval(days => :dias), 1)
       RETURNING id, expires_at`,
      { pid: pacienteId, uid: req.user.id, papel, hash: hashToken(token), rotulo, dias: VALIDADE_DIAS }
    );
    const row = r.rows?.[0] || {};
    await writeAudit({
      ...auditBase(req),
      acao: 'convite_criado',
      recurso: 'convites',
      recursoId: row.id,
      metadados: { paciente_id: pacienteId, papel },
    });
    // O token em claro só é devolvido aqui, uma vez.
    return res.status(201).json({ data: { id: row.id, papel, expires_at: row.expires_at, token } });
  } catch (err) {
    return next(err);
  }
}

async function listar(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await exigirGestor(req.user, pacienteId);
    const rows = await query(
      `SELECT c.id, c.papel, c.rotulo, c.expires_at, c.usado_em, c.revogado_em, c.created_at,
              cu.nome AS criado_por_nome, uu.nome AS usado_por_nome
       FROM convites c
       LEFT JOIN usuarios cu ON cu.id = c.criado_por
       LEFT JOIN usuarios uu ON uu.id = c.usado_por
       WHERE c.paciente_id = :pid
       ORDER BY c.created_at DESC
       LIMIT 50`,
      { pid: pacienteId }
    );
    return res.json({ data: rows.map((c) => ({ ...c, situacao: situacao(c) })) });
  } catch (err) {
    return next(err);
  }
}

async function revogar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const rows = await query('SELECT id, paciente_id, usado_em, revogado_em FROM convites WHERE id = :id', { id });
    if (!rows[0]) throw httpError(404, 'not_found', 'Convite não encontrado.');
    await exigirGestor(req.user, rows[0].paciente_id);
    if (rows[0].revogado_em || rows[0].usado_em) {
      throw httpError(409, 'conflict', 'Este convite já foi usado ou revogado.');
    }
    await query('UPDATE convites SET revogado_em = NOW(), revogado_por = :uid WHERE id = :id', {
      id,
      uid: req.user.id,
    });
    await writeAudit({
      ...auditBase(req),
      acao: 'convite_revogado',
      recurso: 'convites',
      recursoId: id,
      metadados: { paciente_id: rows[0].paciente_id },
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function carregarPorToken(token) {
  if (!token || String(token).length < 20 || String(token).length > 100) return null;
  const rows = await query(
    `SELECT c.*, p.nome AS paciente_nome, u.nome AS criado_por_nome
     FROM convites c
     JOIN pacientes p ON p.id = c.paciente_id
     LEFT JOIN usuarios u ON u.id = c.criado_por
     WHERE c.token_hash = :hash
     LIMIT 1`,
    { hash: hashToken(token) }
  );
  return rows[0] || null;
}

const MSG_410 = {
  revogado: 'Este convite foi cancelado. Peça um novo link a quem convidou.',
  usado: 'Este convite já foi usado. Peça um novo link a quem convidou.',
  expirado: 'Este convite expirou. Peça um novo link a quem convidou.',
};

/** Prévia pública: só primeiro nome do paciente, nome de quem convidou e papel. Sem dados de saúde. */
async function previa(req, res, next) {
  try {
    const c = await carregarPorToken(req.params.token);
    if (!c) throw httpError(404, 'not_found', 'Convite não encontrado. Confira o link.');
    const sit = situacao(c);
    if (sit !== 'pendente') throw httpError(410, `convite_${sit}`, MSG_410[sit]);
    return res.json({
      data: {
        paciente_primeiro_nome: primeiroNome(c.paciente_nome),
        convidado_por: primeiroNome(c.criado_por_nome) || 'Alguém da família',
        papel: c.papel,
        papel_rotulo: PAPEIS[c.papel]?.rotulo || c.papel,
        expires_at: c.expires_at,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function aceitar(req, res, next) {
  try {
    const uid = Number(req.user.id);
    const c = await carregarPorToken(req.params.token);
    if (!c) throw httpError(404, 'not_found', 'Convite não encontrado. Confira o link.');
    const pid = Number(c.paciente_id);
    const resposta = (extra) => ({
      data: {
        paciente_id: pid,
        papel: c.papel,
        perfil_id: PAPEIS[c.papel].perfilId,
        ...extra,
      },
    });

    // Idempotência: quem já usou este convite recebe o mesmo resultado.
    if (c.usado_em && Number(c.usado_por) === uid) return res.json(resposta({ ja_vinculado: true }));
    const sit = situacao(c);
    if (sit !== 'pendente') throw httpError(410, `convite_${sit}`, MSG_410[sit]);

    const ja = await query(
      'SELECT papel FROM usuario_paciente WHERE usuario_id = :uid AND paciente_id = :pid',
      { uid, pid }
    );
    if (ja[0]) {
      // Já faz parte da rede: não consome o convite nem muda o papel.
      return res.json({ data: { paciente_id: pid, papel: ja[0].papel, ja_vinculado: true } });
    }

    const pend = await pendentesDoUsuario(uid);
    if (pend.length) {
      throw httpError(403, 'lgpd_pendente', 'Aceite os termos e a política de privacidade antes de aceitar o convite.');
    }

    // Consome o convite de forma atômica (evita uso duplo em requisições simultâneas).
    const claim = await query(
      `UPDATE convites SET usado_por = :uid, usado_em = NOW()
       WHERE id = :id AND usado_em IS NULL AND revogado_em IS NULL AND expires_at > NOW()
       RETURNING id`,
      { uid, id: c.id }
    );
    if (!claim.rows?.length) throw httpError(410, 'convite_usado', MSG_410.usado);

    const def = PAPEIS[c.papel];
    await linkUsuarioPaciente(uid, pid, c.papel);
    await ensurePapel(uid, def.perfilId, pid, `${def.rotulo} · ${c.paciente_nome || ''}`.trim());
    // Conta nova que veio pelo convite: não precisa cadastrar um paciente próprio.
    await query(
      `UPDATE usuarios SET onboarding_concluido = TRUE, perfil_id = :perfilId
       WHERE id = :uid AND onboarding_concluido = FALSE`,
      { uid, perfilId: def.perfilId }
    );
    await writeAudit({
      ...auditBase(req),
      acao: 'convite_aceito',
      recurso: 'convites',
      recursoId: c.id,
      metadados: { paciente_id: pid, papel: c.papel },
    });
    return res.json(resposta({ ja_vinculado: false }));
  } catch (err) {
    return next(err);
  }
}

async function membros(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await assertPacienteAccess(req.user, pacienteId);
    const gestor = await podeGerenciar(req.user, pacienteId);
    const rows = await query(
      `SELECT up.usuario_id, u.nome, u.email, up.papel, up.created_at
       FROM usuario_paciente up
       JOIN usuarios u ON u.id = up.usuario_id
       WHERE up.paciente_id = :pid
       ORDER BY CASE up.papel WHEN 'responsavel' THEN 1 WHEN 'autocuidado' THEN 2 WHEN 'paciente' THEN 2 ELSE 3 END,
                u.nome`,
      { pid: pacienteId }
    );
    const uid = Number(req.user.id);
    return res.json({
      pode_gerenciar: gestor,
      data: rows.map((r) => ({
        usuario_id: r.usuario_id,
        nome: r.nome,
        email: gestor ? r.email : undefined,
        papel: r.papel,
        desde: r.created_at,
        eu: Number(r.usuario_id) === uid,
        removivel: gestor && Number(r.usuario_id) !== uid && !['autocuidado', 'paciente'].includes(r.papel),
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function removerMembro(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id || req.body?.paciente_id);
    const alvo = Number(req.params.usuarioId);
    if (!pacienteId || !alvo) validationError('Informe o paciente e o membro.');
    await exigirGestor(req.user, pacienteId);
    if (alvo === Number(req.user.id)) validationError('Você não pode remover o seu próprio acesso.');
    const vinc = await query(
      'SELECT papel FROM usuario_paciente WHERE usuario_id = :alvo AND paciente_id = :pid',
      { alvo, pid: pacienteId }
    );
    if (!vinc[0]) throw httpError(404, 'not_found', 'Esta pessoa não faz parte da rede deste paciente.');
    if (['autocuidado', 'paciente'].includes(vinc[0].papel)) {
      validationError('O acesso do próprio paciente não pode ser removido por aqui.');
    }
    const p = { alvo, pid: pacienteId };
    await query('DELETE FROM usuario_paciente WHERE usuario_id = :alvo AND paciente_id = :pid', p);
    await query('UPDATE usuario_perfis SET ativo = FALSE WHERE usuario_id = :alvo AND paciente_id = :pid', p);
    await query(
      `DELETE FROM paciente_responsaveis WHERE paciente_id = :pid
         AND responsavel_id IN (SELECT id FROM responsaveis WHERE usuario_id = :alvo)`,
      p
    );
    await query(
      `UPDATE pacientes SET responsavel_id = NULL WHERE id = :pid
         AND responsavel_id IN (SELECT id FROM responsaveis WHERE usuario_id = :alvo)`,
      p
    );
    await query(
      `UPDATE pacientes SET cuidador_id = NULL WHERE id = :pid
         AND cuidador_id IN (SELECT id FROM cuidadores WHERE usuario_id = :alvo)`,
      p
    );
    await query(
      `UPDATE paciente_cuidador_vinculos SET ativo = FALSE WHERE paciente_id = :pid
         AND cuidador_id IN (SELECT id FROM cuidadores WHERE usuario_id = :alvo)`,
      p
    );
    await writeAudit({
      ...auditBase(req),
      acao: 'membro_removido',
      recurso: 'usuario_paciente',
      recursoId: `${alvo}:${pacienteId}`,
      metadados: { paciente_id: pacienteId, usuario_removido: alvo, papel: vinc[0].papel },
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { criar, listar, revogar, previa, aceitar, membros, removerMembro, hashToken, podeGerenciar };
