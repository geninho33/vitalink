const { query } = require('../config/database');

const PERFIL = {
  ADMIN: 1,
  MEDICO: 2,
  ATENDENTE: 3,
  CUIDADOR: 4,
  RESPONSAVEL: 5,
  PACIENTE: 6,
  AUTOCUIDADO: 7,
};

const UNRESTRICTED = new Set([PERFIL.ADMIN, PERFIL.MEDICO, PERFIL.ATENDENTE]);

async function idsFromUsuarioPaciente(uid) {
  try {
    const rows = await query(
      `SELECT paciente_id FROM usuario_paciente WHERE usuario_id = :uid`,
      { uid }
    );
    return rows.map((r) => Number(r.paciente_id)).filter((id) => Number.isFinite(id));
  } catch {
    return [];
  }
}

/**
 * IDs de pacientes visíveis ao usuário.
 * null = sem restrição (admin/médico/atendente).
 */
async function listAllowedPacienteIds(user) {
  if (!user) return [];
  const perfilId = Number(user.perfilId);
  if (UNRESTRICTED.has(perfilId)) return null;

  const uid = Number(user.id);
  const linked = new Set(await idsFromUsuarioPaciente(uid));
  let rows = [];

  if (perfilId === PERFIL.CUIDADOR) {
    rows = await query(
      `SELECT DISTINCT x.paciente_id
       FROM (
         SELECT p.id AS paciente_id
         FROM pacientes p
         INNER JOIN cuidadores c ON c.id = p.cuidador_id
         WHERE c.usuario_id = :uid
         UNION
         SELECT v.paciente_id
         FROM paciente_cuidador_vinculos v
         INNER JOIN cuidadores c ON c.id = v.cuidador_id
         WHERE c.usuario_id = :uid AND COALESCE(v.ativo, TRUE) = TRUE
         UNION
         SELECT up.paciente_id
         FROM usuario_perfis up
         WHERE up.usuario_id = :uid
           AND up.paciente_id IS NOT NULL
           AND COALESCE(up.ativo, TRUE) = TRUE
       ) x`,
      { uid }
    );
  } else if (perfilId === PERFIL.RESPONSAVEL) {
    rows = await query(
      `SELECT DISTINCT x.paciente_id
       FROM (
         SELECT p.id AS paciente_id
         FROM pacientes p
         INNER JOIN responsaveis r ON r.id = p.responsavel_id
         WHERE r.usuario_id = :uid
         UNION
         SELECT pr.paciente_id
         FROM paciente_responsaveis pr
         INNER JOIN responsaveis r ON r.id = pr.responsavel_id
         WHERE r.usuario_id = :uid
         UNION
         SELECT up.paciente_id
         FROM usuario_perfis up
         WHERE up.usuario_id = :uid
           AND up.paciente_id IS NOT NULL
           AND COALESCE(up.ativo, TRUE) = TRUE
       ) x`,
      { uid }
    );
  } else if (perfilId === PERFIL.PACIENTE || perfilId === PERFIL.AUTOCUIDADO) {
    rows = await query(
      `SELECT DISTINCT up.paciente_id
       FROM usuario_perfis up
       WHERE up.usuario_id = :uid
         AND up.paciente_id IS NOT NULL
         AND COALESCE(up.ativo, TRUE) = TRUE`,
      { uid }
    );
    if (user.pacienteId) linked.add(Number(user.pacienteId));
  }

  for (const r of rows) {
    const id = Number(r.paciente_id);
    if (Number.isFinite(id)) linked.add(id);
  }
  return [...linked];
}

function scopeColumnSql(ids, column, paramKey = 'scopePacienteIds') {
  if (ids === null) return null;
  if (!ids.length) return { sql: '1=0', params: {} };
  return { sql: `${column} = ANY(:${paramKey})`, params: { [paramKey]: ids } };
}

async function applyPacienteScope(user, column) {
  const ids = await listAllowedPacienteIds(user);
  return scopeColumnSql(ids, column);
}

async function assertPacienteAccess(user, pacienteId) {
  if (pacienteId == null || pacienteId === '') return true;
  const ids = await listAllowedPacienteIds(user);
  if (ids === null) return true;
  if (ids.includes(Number(pacienteId))) return true;
  const err = new Error('Você não tem acesso a este paciente.');
  err.status = 403;
  err.code = 'forbidden';
  throw err;
}

async function pacientesScopeForCrud(req) {
  return applyPacienteScope(req.user, 'pacientes.id');
}

function ownerOrLinkedScope(user, ownerSql, linkedParts = []) {
  const perfilId = Number(user?.perfilId);
  if (UNRESTRICTED.has(perfilId)) return Promise.resolve(null);
  return listAllowedPacienteIds(user).then((ids) => {
    const params = { scopeOwnerId: Number(user.id) };
    const parts = [ownerSql];
    if (ids && ids.length) {
      parts.push(...linkedParts);
      params.scopePacienteIds = ids;
    }
    return { sql: parts.join(' OR '), params };
  });
}

async function medicosScopeForCrud(req) {
  return ownerOrLinkedScope(
    req.user,
    '(medicos.usuario_id IS NULL OR medicos.usuario_id = :scopeOwnerId)',
    [
      `medicos.id IN (SELECT pm.medico_id FROM paciente_medicos pm WHERE pm.paciente_id = ANY(:scopePacienteIds))`,
      `medicos.id IN (SELECT p.medico_id FROM pacientes p WHERE p.id = ANY(:scopePacienteIds) AND p.medico_id IS NOT NULL)`,
    ]
  );
}

async function remediosScopeForCrud(req) {
  return applyPacienteScope(req.user, 'remedios.paciente_id');
}

async function hospitaisScopeForCrud(req) {
  return ownerOrLinkedScope(
    req.user,
    '(hospitais_clinicas.usuario_id IS NULL OR hospitais_clinicas.usuario_id = :scopeOwnerId)',
    [
    `hospitais_clinicas.id IN (
      SELECT m.hospital_clinica_id FROM medicos m
      WHERE m.hospital_clinica_id IS NOT NULL AND (
        m.usuario_id = :scopeOwnerId
        OR m.id IN (SELECT pm.medico_id FROM paciente_medicos pm WHERE pm.paciente_id = ANY(:scopePacienteIds))
        OR m.id IN (SELECT p.medico_id FROM pacientes p WHERE p.id = ANY(:scopePacienteIds) AND p.medico_id IS NOT NULL)
      )
    )`,
    `hospitais_clinicas.id IN (
      SELECT me.hospital_clinica_id FROM medico_estabelecimentos me
      INNER JOIN medicos m ON m.id = me.medico_id
      WHERE m.usuario_id = :scopeOwnerId
         OR m.id IN (SELECT pm.medico_id FROM paciente_medicos pm WHERE pm.paciente_id = ANY(:scopePacienteIds))
    )`,
  ]);
}

async function farmaciasScopeForCrud(req) {
  return ownerOrLinkedScope(
    req.user,
    '(farmacias.usuario_id IS NULL OR farmacias.usuario_id = :scopeOwnerId)',
    [
    `farmacias.id IN (
      SELECT r.farmacia_id FROM remedios r
      WHERE r.farmacia_id IS NOT NULL AND r.paciente_id = ANY(:scopePacienteIds)
    )`,
  ]);
}

async function cuidadoresScopeForCrud(req) {
  return ownerOrLinkedScope(req.user, 'cuidadores.usuario_id = :scopeOwnerId', [
    `cuidadores.id IN (
      SELECT p.cuidador_id FROM pacientes p
      WHERE p.cuidador_id IS NOT NULL AND p.id = ANY(:scopePacienteIds)
    )`,
  ]);
}

async function responsaveisScopeForCrud(req) {
  return ownerOrLinkedScope(req.user, 'responsaveis.usuario_id = :scopeOwnerId', [
    `responsaveis.id IN (
      SELECT p.responsavel_id FROM pacientes p
      WHERE p.responsavel_id IS NOT NULL AND p.id = ANY(:scopePacienteIds)
    )`,
    `responsaveis.id IN (
      SELECT pr.responsavel_id FROM paciente_responsaveis pr
      WHERE pr.paciente_id = ANY(:scopePacienteIds)
    )`,
  ]);
}

module.exports = {
  PERFIL,
  listAllowedPacienteIds,
  scopeColumnSql,
  applyPacienteScope,
  assertPacienteAccess,
  pacientesScopeForCrud,
  medicosScopeForCrud,
  remediosScopeForCrud,
  hospitaisScopeForCrud,
  farmaciasScopeForCrud,
  cuidadoresScopeForCrud,
  responsaveisScopeForCrud,
};
