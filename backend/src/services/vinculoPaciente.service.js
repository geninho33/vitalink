const { query } = require('../config/database');
const { PERFIL } = require('./pacienteScope.service');

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function cpfMatchSql(column) {
  return `regexp_replace(COALESCE(${column}, ''), '[^0-9]', '', 'g') = :cpfDigits`;
}

async function findPacienteByCpf(cpf) {
  const cpfDigits = onlyDigits(cpf);
  if (cpfDigits.length !== 11) return null;
  const rows = await query(
    `SELECT id, nome, cpf, data_nascimento, telefone_principal, email, status, sexo
     FROM pacientes
     WHERE ${cpfMatchSql('cpf')}
     ORDER BY id ASC
     LIMIT 1`,
    { cpfDigits }
  );
  return rows[0] || null;
}

async function findResponsavelByUsuarioId(usuarioId) {
  if (!usuarioId) return null;
  const rows = await query(
    `SELECT id, nome, cpf, usuario_id
     FROM responsaveis
     WHERE usuario_id = :usuarioId
     LIMIT 1`,
    { usuarioId }
  );
  return rows[0] || null;
}

async function findPacienteById(pacienteId) {
  const rows = await query(
    `SELECT id, nome, cpf, data_nascimento, telefone_principal, email, status, sexo
     FROM pacientes WHERE id = :id LIMIT 1`,
    { id: pacienteId }
  );
  return rows[0] || null;
}

async function resolveResponsavelIds(user, body = {}) {
  const fromBody = Array.isArray(body.responsavel_ids)
    ? body.responsavel_ids.map(Number).filter((id) => id > 0)
    : [];
  if (fromBody.length) return fromBody;
  const single = Number(body.responsavel_id);
  if (Number.isFinite(single) && single > 0) return [single];
  if (Number(user?.perfilId) === PERFIL.RESPONSAVEL) {
    const row = await findResponsavelByUsuarioId(user.id);
    if (row) return [Number(row.id)];
  }
  return [];
}

async function linkUsuarioPaciente(usuarioId, pacienteId, papel) {
  if (!usuarioId || !pacienteId) return;
  await query(
    `INSERT INTO usuario_paciente (usuario_id, paciente_id, papel)
     VALUES (:usuarioId, :pacienteId, :papel)
     ON CONFLICT DO NOTHING`,
    { usuarioId, pacienteId, papel: papel || null }
  ).catch(() => {});
}

async function ensurePapel(usuarioId, perfilId, pacienteId, rotulo) {
  if (!usuarioId || !perfilId) return;
  await query(
    `INSERT INTO usuario_perfis (usuario_id, perfil_id, paciente_id, rotulo, ativo, is_default)
     VALUES (:usuarioId, :perfilId, :pacienteId, :rotulo, TRUE, FALSE)
     ON CONFLICT DO NOTHING`,
    {
      usuarioId,
      perfilId,
      pacienteId: pacienteId || null,
      rotulo: rotulo || null,
    }
  ).catch(() => {});
}

async function linkResponsavelPaciente(pacienteId, responsavelId) {
  if (!pacienteId || !responsavelId) return;
  await query(
    `INSERT INTO paciente_responsaveis (paciente_id, responsavel_id)
     VALUES (:pacienteId, :responsavelId)
     ON CONFLICT DO NOTHING`,
    { pacienteId, responsavelId }
  );
  await query(
    `UPDATE pacientes
     SET responsavel_id = COALESCE(responsavel_id, :responsavelId)
     WHERE id = :pacienteId`,
    { pacienteId, responsavelId }
  );

  const resp = await query(
    `SELECT usuario_id, nome FROM responsaveis WHERE id = :responsavelId LIMIT 1`,
    { responsavelId }
  );
  const pac = await query(`SELECT nome FROM pacientes WHERE id = :pacienteId LIMIT 1`, {
    pacienteId,
  });
  const uid = resp[0]?.usuario_id;
  if (uid) {
    const nomePac = pac[0]?.nome || '';
    await linkUsuarioPaciente(uid, pacienteId, 'responsavel');
    await ensurePapel(uid, PERFIL.RESPONSAVEL, pacienteId, `Responsável · ${nomePac}`.trim());
  }
}

/**
 * Mesmo CPF em responsável e paciente: a pessoa física passa a ter os dois papéis.
 */
async function attachDualRoleIfSameCpf(pacienteId, pacienteCpf) {
  const cpfDigits = onlyDigits(pacienteCpf);
  if (cpfDigits.length !== 11 || !pacienteId) return;

  const users = await query(
    `SELECT id FROM usuarios WHERE ${cpfMatchSql('cpf')}`,
    { cpfDigits }
  );
  for (const u of users) {
    await linkUsuarioPaciente(u.id, pacienteId, 'paciente');
    await ensurePapel(u.id, PERFIL.PACIENTE, pacienteId, 'Paciente');
  }

  const resps = await query(
    `SELECT id, usuario_id FROM responsaveis WHERE ${cpfMatchSql('cpf')}`,
    { cpfDigits }
  );
  for (const r of resps) {
    await linkResponsavelPaciente(pacienteId, r.id);
    if (r.usuario_id) {
      await linkUsuarioPaciente(r.usuario_id, pacienteId, 'paciente');
      await ensurePapel(r.usuario_id, PERFIL.PACIENTE, pacienteId, 'Paciente');
    }
  }
}

async function linkPacientesComMesmoCpfAoResponsavel(responsavelId, cpf) {
  const existing = await findPacienteByCpf(cpf);
  if (!existing) return existing;
  await linkResponsavelPaciente(existing.id, responsavelId);
  await attachDualRoleIfSameCpf(existing.id, cpf);
  return existing;
}

async function upsertPacienteOnboarding({ p, tipo, pessoaId, usuarioId, pessoaCpf }) {
  const pCpf = onlyDigits(p.cpf);
  let paciente = p.paciente_id ? await findPacienteById(p.paciente_id) : null;
  if (!paciente && pCpf.length === 11) {
    paciente = await findPacienteByCpf(pCpf);
  }

  let created = false;
  if (!paciente) {
    const pNome = String(p.nome || '').trim();
    if (!pNome || !p.data_nascimento || pCpf.length !== 11) {
      return null;
    }
    const result = await query(
      `INSERT INTO pacientes
        (nome, data_nascimento, cpf, telefone_principal, responsavel_id, cuidador_id, status)
       VALUES
        (:nome, :data_nascimento, :cpf, :telefone, :responsavel_id, :cuidador_id, 'ativo')`,
      {
        nome: pNome,
        data_nascimento: p.data_nascimento,
        cpf: pCpf,
        telefone: p.telefone || null,
        responsavel_id: tipo === 'responsavel' ? pessoaId : null,
        cuidador_id: tipo === 'cuidador' ? pessoaId : null,
      }
    );
    paciente = { id: result.insertId, nome: pNome };
    created = true;
  }

  const pacienteId = Number(paciente.id);

  if (tipo === 'responsavel') {
    await linkResponsavelPaciente(pacienteId, pessoaId);
  }
  if (tipo === 'cuidador') {
    await query(
      `INSERT INTO paciente_cuidador_vinculos
        (paciente_id, tipo, cuidador_id, ativo, data_inicio)
       VALUES (:pacienteId, 'pf', :pessoaId, TRUE, CURRENT_DATE)
       ON CONFLICT DO NOTHING`,
      { pacienteId, pessoaId }
    ).catch(() => {});
  }

  const perfilId = tipo === 'cuidador' ? PERFIL.CUIDADOR : PERFIL.RESPONSAVEL;
  const rotuloTipo = tipo === 'cuidador' ? 'Cuidador' : 'Responsável';
  await linkUsuarioPaciente(usuarioId, pacienteId, tipo);
  await ensurePapel(
    usuarioId,
    perfilId,
    pacienteId,
    `${rotuloTipo} · ${paciente.nome || ''}`.trim()
  );

  if (onlyDigits(pessoaCpf) === pCpf) {
    await attachDualRoleIfSameCpf(pacienteId, pCpf);
  }

  return { id: pacienteId, nome: paciente.nome, vinculado: !created };
}

async function upsertPacienteAutocuidado({
  usuarioId,
  nome,
  cpf,
  telefone,
  dataNascimento,
}) {
  const pCpf = onlyDigits(cpf);
  let paciente = await findPacienteByCpf(pCpf);
  let created = false;
  if (!paciente) {
    const result = await query(
      `INSERT INTO pacientes
        (nome, data_nascimento, cpf, telefone_principal, status)
       VALUES
        (:nome, :data_nascimento, :cpf, :telefone, 'ativo')`,
      {
        nome,
        data_nascimento: dataNascimento,
        cpf: pCpf,
        telefone: telefone || null,
      }
    );
    paciente = { id: result.insertId, nome };
    created = true;
  }

  const pacienteId = Number(paciente.id);
  await linkUsuarioPaciente(usuarioId, pacienteId, 'autocuidado');
  await ensurePapel(usuarioId, PERFIL.AUTOCUIDADO, pacienteId, 'Autocuidado');
  await ensurePapel(usuarioId, PERFIL.PACIENTE, pacienteId, 'Paciente');
  await attachDualRoleIfSameCpf(pacienteId, pCpf);
  return { id: pacienteId, nome: paciente.nome, vinculado: !created };
}

module.exports = {
  onlyDigits,
  findPacienteByCpf,
  findPacienteById,
  findResponsavelByUsuarioId,
  resolveResponsavelIds,
  linkResponsavelPaciente,
  attachDualRoleIfSameCpf,
  linkPacientesComMesmoCpfAoResponsavel,
  upsertPacienteOnboarding,
  upsertPacienteAutocuidado,
};
