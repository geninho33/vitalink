const crypto = require('crypto');
const { query, isDuplicateKey } = require('../config/database');
const { hashPassword } = require('../utils/password');
const { writeAudit } = require('../services/audit.service');
const { syncUsuarioPerfilPadrao } = require('../services/papel.service');
const { sendConfirmacaoEmail, sendResetSenha } = require('../services/mail.service');
const { addressNormalize } = require('../utils/crudFactory');
const {
  assertEmail,
  assertPassword,
  assertCpf,
  assertAdult,
  isValidCpf,
  parseIsoDate,
} = require('../utils/validation');
const { upsertPacienteOnboarding, upsertPacienteAutocuidado } = require('../services/vinculoPaciente.service');

const PERFIL_CUIDADOR = 4;
const PERFIL_RESPONSAVEL = 5;
const PERFIL_AUTOCUIDADO = 7;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function isDev() {
  return (process.env.NODE_ENV || 'development') !== 'production';
}

async function issueToken(usuarioId, tipo, hours) {
  const token = newToken();
  const token_hash = hashToken(token);
  const expira = new Date(Date.now() + hours * 3600 * 1000);
  await query(
    `INSERT INTO auth_tokens (usuario_id, tipo, token_hash, expira_em)
     VALUES (:usuario_id, :tipo, :token_hash, :expira_em)`,
    { usuario_id: usuarioId, tipo, token_hash, expira_em: expira.toISOString() }
  );
  return token;
}

async function consumeToken(token, tipo) {
  const token_hash = hashToken(token);
  const rows = await query(
    `SELECT id, usuario_id FROM auth_tokens
     WHERE token_hash = :token_hash AND tipo = :tipo
       AND usado_em IS NULL AND expira_em > NOW()
     LIMIT 1`,
    { token_hash, tipo }
  );
  const row = rows[0];
  if (!row) {
    const err = new Error('Link inválido ou expirado.');
    err.status = 400;
    err.code = 'invalid_token';
    throw err;
  }
  await query(`UPDATE auth_tokens SET usado_em = NOW() WHERE id = :id`, { id: row.id });
  return row.usuario_id;
}

async function registro(req, res, next) {
  try {
    const { nome, email, senha, cpf, data_nascimento } = req.body || {};
    if (!nome || !email || !senha || !cpf || !data_nascimento) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Campos obrigatórios: nome, e-mail, CPF, data de nascimento e senha.',
      });
    }
    const emailOk = assertEmail(email);
    assertPassword(senha);
    const cpfOk = assertCpf(cpf);
    const nasc = assertAdult(data_nascimento);

    const senha_hash = await hashPassword(senha);
    const result = await query(
      `INSERT INTO usuarios
        (nome, email, senha_hash, status, perfil_id, onboarding_concluido, cpf, data_nascimento)
       VALUES
        (:nome, :email, :senha_hash, 'pendente_confirmacao', :perfil_id, FALSE, :cpf, :nasc)`,
      {
        nome: String(nome).trim(),
        email: emailOk,
        senha_hash,
        perfil_id: PERFIL_RESPONSAVEL,
        cpf: cpfOk,
        nasc,
      }
    );
    const usuarioId = result.insertId;
    await syncUsuarioPerfilPadrao(usuarioId, PERFIL_RESPONSAVEL);

    const token = await issueToken(usuarioId, 'confirmacao_email', 24);
    const mail = await sendConfirmacaoEmail({
      to: String(email).trim().toLowerCase(),
      nome: String(nome).trim(),
      token,
    });

    await writeAudit({
      usuarioId,
      acao: 'registro_publico',
      recurso: 'auth',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      ok: true,
      message: 'Cadastro criado. Confirme o e-mail para liberar o acesso.',
      ...(isDev() || mail.mocked ? { dev_link: mail.url } : {}),
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      err.status = 409;
      err.message = 'Este e-mail já está cadastrado.';
    }
    return next(err);
  }
}

async function confirmarEmail(req, res, next) {
  try {
    const token = req.body?.token || req.query?.token;
    if (!token) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Token de confirmação obrigatório.',
      });
    }
    const usuarioId = await consumeToken(String(token), 'confirmacao_email');
    await query(
      `UPDATE usuarios
       SET status = 'ativo', email_verificado_em = NOW()
       WHERE id = :id`,
      { id: usuarioId }
    );
    await writeAudit({
      usuarioId,
      acao: 'confirmacao_email',
      recurso: 'auth',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.json({ ok: true, message: 'E-mail confirmado. Você já pode entrar.' });
  } catch (err) {
    return next(err);
  }
}

async function esqueciSenha(req, res, next) {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const generic = {
      ok: true,
      message: 'Se o e-mail estiver cadastrado, você receberá as instruções.',
    };
    if (!email) return res.json(generic);

    const rows = await query(
      `SELECT id, nome, email, status FROM usuarios WHERE email = :email LIMIT 1`,
      { email }
    );
    const user = rows[0];
    if (!user || user.status === 'bloqueado') {
      return res.json(generic);
    }

    const token = await issueToken(user.id, 'reset_senha', 0.5);
    const mail = await sendResetSenha({ to: user.email, nome: user.nome, token });

    await writeAudit({
      usuarioId: user.id,
      acao: 'reset_senha_solicitado',
      recurso: 'auth',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      ...generic,
      ...(isDev() || mail.mocked ? { dev_link: mail.url } : {}),
    });
  } catch (err) {
    return next(err);
  }
}

async function redefinirSenha(req, res, next) {
  try {
    const { token, senha } = req.body || {};
    if (!token || !senha) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe o token e a nova senha.',
      });
    }
    assertPassword(senha);
    const usuarioId = await consumeToken(String(token), 'reset_senha');
    const senha_hash = await hashPassword(senha);
    await query(`UPDATE usuarios SET senha_hash = :senha_hash WHERE id = :id`, {
      senha_hash,
      id: usuarioId,
    });
    await writeAudit({
      usuarioId,
      acao: 'reset_senha_concluido',
      recurso: 'auth',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.json({ ok: true, message: 'Senha redefinida. Faça login com a nova senha.' });
  } catch (err) {
    return next(err);
  }
}

function defaultAddress(payload) {
  return {
    cep: onlyDigits(payload.cep).slice(0, 8) || '00000000',
    logradouro: payload.logradouro || 'A definir',
    numero: payload.numero || 's/n',
    complemento: payload.complemento || null,
    bairro: payload.bairro || 'A definir',
    cidade: payload.cidade || 'A definir',
    uf: String(payload.uf || 'SP').toUpperCase().slice(0, 2),
  };
}

async function onboarding(req, res, next) {
  try {
    const tipo = String(req.body?.tipo || '').toLowerCase();
    if (tipo !== 'cuidador' && tipo !== 'responsavel' && tipo !== 'autocuidado') {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Selecione o perfil: cuidador, responsável ou autocuidado.',
      });
    }

    const perfilId =
      tipo === 'cuidador'
        ? PERFIL_CUIDADOR
        : tipo === 'autocuidado'
          ? PERFIL_AUTOCUIDADO
          : PERFIL_RESPONSAVEL;
    const dados = req.body?.dados || {};
    const pacientes = Array.isArray(req.body?.pacientes) ? req.body.pacientes.slice(0, 2) : [];

    const nome = String(dados.nome || req.user.nome || '').trim();
    const telefone = String(dados.telefone || dados.telefone_principal || '').trim();
    if (!nome || !telefone) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe nome, CPF e telefone.',
      });
    }
    const cpf = assertCpf(dados.cpf);

    if (tipo === 'autocuidado') {
      const pNasc = parseIsoDate(dados.data_nascimento);
      if (!pNasc) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Informe sua data de nascimento no formato DD/MM/AAAA.',
        });
      }
      const self = await upsertPacienteAutocuidado({
        usuarioId: req.user.id,
        nome,
        cpf,
        telefone,
        dataNascimento: pNasc,
      });

      await query(
        `UPDATE usuarios
         SET perfil_id = :perfilId, onboarding_concluido = TRUE, status = 'ativo'
         WHERE id = :id`,
        { perfilId, id: req.user.id }
      );
      await syncUsuarioPerfilPadrao(req.user.id, perfilId);

      await writeAudit({
        usuarioId: req.user.id,
        acao: 'onboarding_concluido',
        recurso: 'auth',
        ip: req.ip,
        userAgent: req.get('user-agent'),
        metadados: { tipo, pacientes: 1 },
      });

      return res.json({
        ok: true,
        perfil_id: perfilId,
        pacientes: [self],
        message: 'Onboarding de autocuidado concluído.',
      });
    }

    const addr = defaultAddress(addressNormalize({ ...dados }));
    const table = tipo === 'cuidador' ? 'cuidadores' : 'responsaveis';
    const extraCol = tipo === 'cuidador' ? 'turno' : 'grau_parentesco';
    const extraVal = tipo === 'cuidador' ? dados.turno || null : dados.grau_parentesco || null;

    const existing = await query(
      `SELECT id FROM ${table} WHERE usuario_id = :uid LIMIT 1`,
      { uid: req.user.id }
    );

    let pessoaId = existing[0]?.id;
    if (pessoaId) {
      await query(
        `UPDATE ${table} SET
           nome = :nome, cpf = :cpf, telefone_principal = :telefone, email = :email,
           cep = :cep, logradouro = :logradouro, numero = :numero, complemento = :complemento,
           bairro = :bairro, cidade = :cidade, uf = :uf, ${extraCol} = :extra
         WHERE id = :id`,
        {
          id: pessoaId,
          nome,
          cpf,
          telefone,
          email: req.user.email,
          extra: extraVal,
          ...addr,
        }
      );
    } else {
      const inserted = await query(
        `INSERT INTO ${table}
          (usuario_id, nome, cpf, telefone_principal, email, cep, logradouro, numero,
           complemento, bairro, cidade, uf, ${extraCol}, status)
         VALUES
          (:uid, :nome, :cpf, :telefone, :email, :cep, :logradouro, :numero,
           :complemento, :bairro, :cidade, :uf, :extra, 'ativo')`,
        {
          uid: req.user.id,
          nome,
          cpf,
          telefone,
          email: req.user.email,
          extra: extraVal,
          ...addr,
        }
      );
      pessoaId = inserted.insertId;
    }

    const createdPacientes = [];
    for (const p of pacientes) {
      const pNome = String(p.nome || '').trim();
      const pCpf = onlyDigits(p.cpf);
      const existingId = p.paciente_id ? Number(p.paciente_id) : null;
      if (!existingId && pCpf.length !== 11) continue;
      if (pCpf.length === 11 && !isValidCpf(p.cpf)) {
        return res.status(400).json({
          error: 'validation_error',
          message: `CPF inválido para o paciente ${pNome || pCpf}.`,
        });
      }
      let pNasc = null;
      if (p.data_nascimento) {
        pNasc = parseIsoDate(p.data_nascimento);
        if (!pNasc && !existingId) {
          return res.status(400).json({
            error: 'validation_error',
            message: `Informe a data de nascimento de ${pNome || 'paciente'} no formato DD/MM/AAAA.`,
          });
        }
      }

      const upserted = await upsertPacienteOnboarding({
        p: {
          ...p,
          nome: pNome,
          cpf: pCpf,
          data_nascimento: pNasc,
          paciente_id: existingId,
        },
        tipo,
        pessoaId,
        usuarioId: req.user.id,
        pessoaCpf: cpf,
      });
      if (upserted) createdPacientes.push(upserted);
    }

    if (!createdPacientes.length) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe ao menos um paciente (novo ou já cadastrado, pelo CPF).',
      });
    }

    await query(
      `UPDATE usuarios
       SET perfil_id = :perfilId, onboarding_concluido = TRUE, status = 'ativo'
       WHERE id = :id`,
      { perfilId, id: req.user.id }
    );
    await syncUsuarioPerfilPadrao(req.user.id, perfilId);

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'onboarding_concluido',
      recurso: 'auth',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: { tipo, pacientes: createdPacientes.length },
    });

    return res.json({
      ok: true,
      perfil_id: perfilId,
      pacientes: createdPacientes,
      message: 'Onboarding concluído.',
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      err.status = 409;
      err.message =
        'Este CPF já está em uso neste cadastro. Se o paciente já existe, informe o CPF para vincular a ficha em vez de criar outra.';
    }
    return next(err);
  }
}

module.exports = {
  registro,
  confirmarEmail,
  esqueciSenha,
  redefinirSenha,
  onboarding,
};
