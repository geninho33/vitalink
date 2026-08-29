const { isValidCpf } = require('../utils/validation');
const {
  findPacienteByCpf,
  findPacienteById,
  resolveResponsavelIds,
  linkResponsavelPaciente,
  attachDualRoleIfSameCpf,
} = require('../services/vinculoPaciente.service');

function publicPaciente(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    nome: row.nome,
    cpf: row.cpf,
    data_nascimento: row.data_nascimento,
    telefone_principal: row.telefone_principal,
    status: row.status,
  };
}

async function buscarPorCpf(req, res, next) {
  try {
    const cpf = req.params.cpf || req.query.cpf;
    if (!isValidCpf(cpf)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe um CPF válido.',
      });
    }
    const found = await findPacienteByCpf(cpf);
    if (!found) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Nenhum paciente com este CPF.',
      });
    }
    return res.json({ data: publicPaciente(found) });
  } catch (err) {
    return next(err);
  }
}

async function vincularResponsavel(req, res, next) {
  try {
    const pacienteId = Number(req.params.pacienteId);
    const paciente = await findPacienteById(pacienteId);
    if (!paciente) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Paciente não encontrado.',
      });
    }

    const ids = await resolveResponsavelIds(req.user, req.body || {});
    if (!ids.length) {
      return res.status(400).json({
        error: 'validation_error',
        message:
          'Informe o responsável ou entre com um perfil de responsável para vincular este paciente.',
      });
    }

    for (const rid of ids) {
      await linkResponsavelPaciente(pacienteId, rid);
    }
    await attachDualRoleIfSameCpf(pacienteId, paciente.cpf);

    return res.json({
      ok: true,
      id: pacienteId,
      vinculado: true,
      message: `Paciente ${paciente.nome} vinculado ao responsável.`,
    });
  } catch (err) {
    return next(err);
  }
}

async function vincularMeuPaciente(req, res, next) {
  try {
    const cpf = req.body?.cpf;
    if (!isValidCpf(cpf)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe um CPF válido para localizar o paciente.',
      });
    }
    const found = await findPacienteByCpf(cpf);
    if (!found) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Nenhum paciente com este CPF. Cadastre-o ou confira os dígitos.',
      });
    }
    req.params.pacienteId = found.id;
    return vincularResponsavel(req, res, next);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  buscarPorCpf,
  vincularResponsavel,
  vincularMeuPaciente,
};
