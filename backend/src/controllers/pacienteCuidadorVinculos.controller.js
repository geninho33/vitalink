const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { onlyDigits, addressNormalize } = require('../utils/crudFactory');

function clientMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

async function listByPaciente(req, res, next) {
  try {
    const pacienteId = req.params.pacienteId || req.params.id;
    const rows = await query(
      `SELECT v.*,
              e.nome_fantasia AS empresa_nome,
              e.cnpj AS empresa_cnpj,
              c.nome AS cuidador_nome
       FROM paciente_cuidador_vinculos v
       LEFT JOIN empresas_cuidadoras e ON e.id = v.empresa_cuidadora_id
       LEFT JOIN cuidadores c ON c.id = v.cuidador_id
       WHERE v.paciente_id = :pacienteId
       ORDER BY v.data_inicio DESC, v.id DESC`,
      { pacienteId }
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const pacienteId = Number(req.params.pacienteId || req.params.id);
    const b = addressNormalize({ ...(req.body || {}) });
    const tipo = String(b.tipo || '').toLowerCase();
    if (!pacienteId || !['pj', 'pf'].includes(tipo)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe paciente e tipo (pj ou pf).',
      });
    }
    if (tipo === 'pj' && !b.empresa_cuidadora_id) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Vínculo PJ exige empresa_cuidadora_id.',
      });
    }
    if (tipo === 'pf' && !b.profissional_nome && !b.cuidador_id) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Vínculo PF exige cuidador_id ou profissional_nome.',
      });
    }

    const result = await query(
      `INSERT INTO paciente_cuidador_vinculos
        (paciente_id, tipo, empresa_cuidadora_id, cuidador_id, nome_escalado, contato_escalado,
         profissional_nome, profissional_cpf, contato,
         cep, logradouro, numero, complemento, bairro, cidade, uf,
         data_inicio, data_termino, ativo)
       VALUES
        (:paciente_id, :tipo, :empresa_cuidadora_id, :cuidador_id, :nome_escalado, :contato_escalado,
         :profissional_nome, :profissional_cpf, :contato,
         :cep, :logradouro, :numero, :complemento, :bairro, :cidade, :uf,
         :data_inicio, :data_termino, :ativo)`,
      {
        paciente_id: pacienteId,
        tipo,
        empresa_cuidadora_id: b.empresa_cuidadora_id || null,
        cuidador_id: b.cuidador_id || null,
        nome_escalado: b.nome_escalado || null,
        contato_escalado: b.contato_escalado ? onlyDigits(b.contato_escalado) : null,
        profissional_nome: b.profissional_nome || null,
        profissional_cpf: b.profissional_cpf ? onlyDigits(b.profissional_cpf) : null,
        contato: b.contato ? onlyDigits(b.contato) : null,
        cep: b.cep || null,
        logradouro: b.logradouro || null,
        numero: b.numero || null,
        complemento: b.complemento || null,
        bairro: b.bairro || null,
        cidade: b.cidade || null,
        uf: b.uf || null,
        data_inicio: b.data_inicio || new Date().toISOString().slice(0, 10),
        data_termino: b.data_termino || null,
        ativo: b.ativo !== false && b.ativo !== 'false',
      }
    );

    // Atualiza cuidador_id legado do paciente quando vínculo ativo PF/PJ com cuidador
    if (b.cuidador_id && (b.ativo !== false)) {
      await query(`UPDATE pacientes SET cuidador_id = :cuidadorId WHERE id = :id`, {
        cuidadorId: b.cuidador_id,
        id: pacienteId,
      });
    }

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'paciente_cuidador_vinculos',
      recursoId: result.insertId,
      ...clientMeta(req),
    });

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = req.params.vinculoId || req.params.id;
    const b = addressNormalize({ ...(req.body || {}) });
    await query(
      `UPDATE paciente_cuidador_vinculos SET
         tipo = COALESCE(:tipo, tipo),
         empresa_cuidadora_id = COALESCE(:empresa_cuidadora_id, empresa_cuidadora_id),
         cuidador_id = COALESCE(:cuidador_id, cuidador_id),
         nome_escalado = COALESCE(:nome_escalado, nome_escalado),
         contato_escalado = COALESCE(:contato_escalado, contato_escalado),
         profissional_nome = COALESCE(:profissional_nome, profissional_nome),
         profissional_cpf = COALESCE(:profissional_cpf, profissional_cpf),
         contato = COALESCE(:contato, contato),
         cep = COALESCE(:cep, cep),
         logradouro = COALESCE(:logradouro, logradouro),
         numero = COALESCE(:numero, numero),
         complemento = COALESCE(:complemento, complemento),
         bairro = COALESCE(:bairro, bairro),
         cidade = COALESCE(:cidade, cidade),
         uf = COALESCE(:uf, uf),
         data_inicio = COALESCE(:data_inicio, data_inicio),
         data_termino = COALESCE(:data_termino, data_termino),
         ativo = COALESCE(:ativo, ativo)
       WHERE id = :id`,
      {
        id,
        tipo: b.tipo ?? null,
        empresa_cuidadora_id: b.empresa_cuidadora_id ?? null,
        cuidador_id: b.cuidador_id ?? null,
        nome_escalado: b.nome_escalado ?? null,
        contato_escalado:
          b.contato_escalado != null ? onlyDigits(b.contato_escalado) : null,
        profissional_nome: b.profissional_nome ?? null,
        profissional_cpf:
          b.profissional_cpf != null ? onlyDigits(b.profissional_cpf) : null,
        contato: b.contato != null ? onlyDigits(b.contato) : null,
        cep: b.cep ?? null,
        logradouro: b.logradouro ?? null,
        numero: b.numero ?? null,
        complemento: b.complemento ?? null,
        bairro: b.bairro ?? null,
        cidade: b.cidade ?? null,
        uf: b.uf ?? null,
        data_inicio: b.data_inicio ?? null,
        data_termino: b.data_termino ?? null,
        ativo:
          b.ativo === undefined
            ? null
            : b.ativo === true || b.ativo === 'true' || b.ativo === 1,
      }
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'paciente_cuidador_vinculos',
      recursoId: id,
      ...clientMeta(req),
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = req.params.vinculoId || req.params.id;
    await query(`DELETE FROM paciente_cuidador_vinculos WHERE id = :id`, { id });
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'deletar',
      recurso: 'paciente_cuidador_vinculos',
      recursoId: id,
      ...clientMeta(req),
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listByPaciente, create, update, remove };
