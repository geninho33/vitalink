const { query, isDuplicateKey } = require('../config/database');
const { writeAudit, buildAuditDiff } = require('../services/audit.service');
const { createCrudController, addressNormalize, pick, requireFields } = require('../utils/crudFactory');
const { pacientesScopeForCrud } = require('../services/pacienteScope.service');
const { parseIsoDate, isValidCpf, isValidEmail } = require('../utils/validation');
const {
  syncRemedioAgenda,
  clearFutureDoses,
} = require('../services/medicamentoAgenda.service');
const {
  findPacienteByCpf,
  resolveResponsavelIds,
  linkResponsavelPaciente,
  attachDualRoleIfSameCpf,
} = require('../services/vinculoPaciente.service');

async function syncMedicoEstabelecimentos(medicoId, estabelecimentoIds) {
  if (!Array.isArray(estabelecimentoIds)) return;
  await query('DELETE FROM medico_estabelecimentos WHERE medico_id = :medicoId', { medicoId });
  const ids = estabelecimentoIds.map(Number).filter((id) => id > 0);
  for (const hospital_clinica_id of ids) {
    await query(
      `INSERT INTO medico_estabelecimentos (medico_id, hospital_clinica_id)
       VALUES (:medicoId, :hospital_clinica_id)
       ON CONFLICT DO NOTHING`,
      { medicoId, hospital_clinica_id }
    );
  }
  if (ids.length) {
    await query('UPDATE medicos SET hospital_clinica_id = :hid WHERE id = :medicoId', {
      hid: ids[0],
      medicoId,
    });
  } else {
    await query('UPDATE medicos SET hospital_clinica_id = NULL WHERE id = :medicoId', { medicoId });
  }
}

async function syncPacienteMedicos(pacienteId, medicoIds) {
  if (!Array.isArray(medicoIds)) return;
  await query('DELETE FROM paciente_medicos WHERE paciente_id = :pacienteId', { pacienteId });
  const ids = medicoIds.map(Number).filter((id) => id > 0);
  for (let i = 0; i < ids.length; i++) {
    await query(
      `INSERT INTO paciente_medicos (paciente_id, medico_id, principal)
       VALUES (:pacienteId, :medico_id, :principal)`,
      { pacienteId, medico_id: ids[i], principal: i === 0 }
    );
  }
  if (ids.length) {
    await query('UPDATE pacientes SET medico_id = :mid WHERE id = :pacienteId', {
      mid: ids[0],
      pacienteId,
    });
  }
}

async function syncPacienteResponsaveis(pacienteId, responsavelIds) {
  if (!Array.isArray(responsavelIds)) return;
  await query('DELETE FROM paciente_responsaveis WHERE paciente_id = :pacienteId', { pacienteId });
  const ids = responsavelIds.map(Number).filter((id) => id > 0);
  for (const responsavel_id of ids) {
    await query(
      `INSERT INTO paciente_responsaveis (paciente_id, responsavel_id)
       VALUES (:pacienteId, :responsavel_id)
       ON CONFLICT DO NOTHING`,
      { pacienteId, responsavel_id }
    );
  }
  if (ids.length) {
    await query('UPDATE pacientes SET responsavel_id = :rid WHERE id = :pacienteId', {
      rid: ids[0],
      pacienteId,
    });
  }
}

function wrapCreateUpdate(base, { table, recurso, allFields, requiredCreate, normalize, afterSave, onDuplicate }) {
  async function create(req, res, next) {
    try {
      const body = req.body || {};
      let payload = pick(body, allFields);
      if (normalize) payload = normalize(payload, 'create');
      requireFields(payload, requiredCreate);

      const cols = Object.keys(payload);
      const placeholders = cols.map((c) => `:${c}`).join(', ');
      const result = await query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
        payload
      );

      await afterSave(result.insertId, body);

      await writeAudit({
        usuarioId: req.user.id,
        acao: 'criar',
        recurso,
        recursoId: result.insertId,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(201).json({ id: result.insertId });
    } catch (err) {
      if (isDuplicateKey(err) && typeof onDuplicate === 'function') {
        try {
          const handled = await onDuplicate(req);
          if (handled) {
            return res.status(handled.status || 200).json(handled.body);
          }
        } catch (handledErr) {
          return next(handledErr);
        }
      }
      if (isDuplicateKey(err)) {
        err.status = 409;
        err.message = 'Registro duplicado.';
      }
      return next(err);
    }
  }

  async function update(req, res, next) {
    try {
      const body = req.body || {};
      let payload = pick(body, allFields);
      if (normalize) payload = normalize(payload, 'update');
      const cols = Object.keys(payload);
      if (!cols.length && !afterSaveNeedsBody(body)) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Nenhum campo para atualizar.',
        });
      }

      const beforeRows = await query(`SELECT * FROM ${table} WHERE id = :id LIMIT 1`, {
        id: req.params.id,
      });
      const before = beforeRows[0] || {};
      if (!before.id) {
        return res.status(404).json({ error: 'not_found', message: 'Registro não encontrado.' });
      }

      if (cols.length) {
        const sets = cols.map((c) => `${c} = :${c}`).join(', ');
        await query(`UPDATE ${table} SET ${sets} WHERE id = :id`, {
          ...payload,
          id: req.params.id,
        });
      }

      await afterSave(req.params.id, body);

      const diff = cols.length ? buildAuditDiff(before, { ...before, ...payload }, cols) : undefined;
      await writeAudit({
        usuarioId: req.user.id,
        acao: 'editar',
        recurso,
        recursoId: req.params.id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        metadados: diff ? { diff } : undefined,
      });

      return res.json({ ok: true });
    } catch (err) {
      if (isDuplicateKey(err)) {
        err.status = 409;
        err.message = 'Registro duplicado.';
      }
      return next(err);
    }
  }

  return { ...base, create, update };
}

function afterSaveNeedsBody(body) {
  return (
    Array.isArray(body?.estabelecimento_ids) ||
    Array.isArray(body?.medico_ids) ||
    Array.isArray(body?.responsavel_ids)
  );
}

const medicosConfig = {
  table: 'medicos',
  recurso: 'medicos',
  menuRota: '/medicos',
  searchable: ['medicos.nome', 'medicos.crm', 'medicos.especialidade'],
  requiredCreate: ['nome', 'especialidade', 'crm', 'uf_crm'],
  optional: [
    'usuario_id',
    'hospital_clinica_id',
    'cpf',
    'telefone_principal',
    'turno',
    'telefone_secundario',
    'email',
    'foto_url',
    'cep',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'uf',
    'observacoes',
    'status',
  ],
  normalize: (p) => {
    const n = addressNormalize({ ...p });
    if (!n.status) n.status = 'ativo';
    return n;
  },
  selectExtra: `,
    (SELECT COALESCE(
      json_agg(json_build_object('id', h.id, 'nome_fantasia', h.nome_fantasia) ORDER BY h.nome_fantasia),
      '[]'::json
    )
     FROM medico_estabelecimentos me
     JOIN hospitais_clinicas h ON h.id = me.hospital_clinica_id
     WHERE me.medico_id = medicos.id) AS estabelecimentos`,
  joins: '',
};

const medicosAllFields = [...new Set([...medicosConfig.requiredCreate, ...medicosConfig.optional])];
const medicosBase = createCrudController(medicosConfig);
const medicos = wrapCreateUpdate(medicosBase, {
  table: medicosConfig.table,
  recurso: medicosConfig.recurso,
  allFields: medicosAllFields,
  requiredCreate: medicosConfig.requiredCreate,
  normalize: medicosConfig.normalize,
  afterSave: async (medicoId, body) => {
    if (Array.isArray(body.estabelecimento_ids)) {
      await syncMedicoEstabelecimentos(medicoId, body.estabelecimento_ids);
    }
  },
});

const pacientesConfig = {
  table: 'pacientes',
  recurso: 'pacientes',
  menuRota: '/pacientes',
  searchable: ['pacientes.nome', 'pacientes.cpf', 'pacientes.convenio_nome'],
  requiredCreate: ['nome', 'data_nascimento', 'cpf'],
  optional: [
    'sexo',
    'diagnostico_principal',
    'alergias',
    'tipo_sanguineo',
    'foto_url',
    'foto_arquivo_id',
    'telefone_principal',
    'email',
    'convenio_nome',
    'convenio_numero',
    'convenio_validade',
    'convenio_frente_arquivo_id',
    'convenio_verso_arquivo_id',
    'responsavel_id',
    'cuidador_id',
    'medico_id',
    'cep',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'uf',
    'observacoes',
    'status',
  ],
  normalize: (p) => {
    const n = addressNormalize({ ...p });
    if (!n.status) n.status = 'ativo';
    if (!n.tipo_sanguineo) n.tipo_sanguineo = 'NI';
    if (n.diagnostico_principal != null && String(n.diagnostico_principal).trim() === '') {
      n.diagnostico_principal = null;
    }
    if (n.data_nascimento) {
      n.data_nascimento = parseIsoDate(n.data_nascimento) || n.data_nascimento;
    }
    if (n.convenio_validade) {
      n.convenio_validade = parseIsoDate(n.convenio_validade) || n.convenio_validade;
    }
    if (n.cpf && !isValidCpf(n.cpf)) {
      const err = new Error('CPF inválido.');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    if (n.email && !isValidEmail(n.email)) {
      const err = new Error('E-mail inválido.');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    return n;
  },
  selectExtra: `,
    r.nome AS responsavel_nome,
    c.nome AS cuidador_nome,
    m.nome AS medico_nome,
    af.caminho AS foto_caminho,
    acf.caminho AS convenio_frente_caminho,
    acv.caminho AS convenio_verso_caminho,
    (SELECT COALESCE(json_agg(pm.medico_id ORDER BY pm.medico_id), '[]'::json)
     FROM paciente_medicos pm
     WHERE pm.paciente_id = pacientes.id) AS medico_ids,
    (SELECT COALESCE(json_agg(pr.responsavel_id ORDER BY pr.responsavel_id), '[]'::json)
     FROM paciente_responsaveis pr
     WHERE pr.paciente_id = pacientes.id) AS responsavel_ids,
    (SELECT string_agg(md.nome, ', ' ORDER BY md.nome)
     FROM paciente_medicos pm
     JOIN medicos md ON md.id = pm.medico_id
     WHERE pm.paciente_id = pacientes.id) AS medicos_nomes,
    (SELECT string_agg(resp.nome, ', ' ORDER BY resp.nome)
     FROM paciente_responsaveis pr
     JOIN responsaveis resp ON resp.id = pr.responsavel_id
     WHERE pr.paciente_id = pacientes.id) AS responsaveis_nomes`,
  joins: `
    LEFT JOIN responsaveis r ON r.id = pacientes.responsavel_id
    LEFT JOIN cuidadores c ON c.id = pacientes.cuidador_id
    LEFT JOIN medicos m ON m.id = pacientes.medico_id
    LEFT JOIN arquivos af ON af.id = pacientes.foto_arquivo_id
    LEFT JOIN arquivos acf ON acf.id = pacientes.convenio_frente_arquivo_id
    LEFT JOIN arquivos acv ON acv.id = pacientes.convenio_verso_arquivo_id`,
  buildScope: pacientesScopeForCrud,
};

const pacientesAllFields = [...new Set([...pacientesConfig.requiredCreate, ...pacientesConfig.optional])];
const pacientesBase = createCrudController(pacientesConfig);
const pacientes = wrapCreateUpdate(pacientesBase, {
  table: pacientesConfig.table,
  recurso: pacientesConfig.recurso,
  allFields: pacientesAllFields,
  requiredCreate: pacientesConfig.requiredCreate,
  normalize: pacientesConfig.normalize,
  afterSave: async (pacienteId, body) => {
    if (Array.isArray(body.medico_ids)) {
      await syncPacienteMedicos(pacienteId, body.medico_ids);
    }
    if (Array.isArray(body.responsavel_ids)) {
      await syncPacienteResponsaveis(pacienteId, body.responsavel_ids);
    }
    if (body.cpf) {
      await attachDualRoleIfSameCpf(pacienteId, body.cpf);
    }
  },
  onDuplicate: async (req) => {
    const existing = await findPacienteByCpf(req.body?.cpf);
    if (!existing) return null;
    const ids = await resolveResponsavelIds(req.user, req.body || {});
    if (!ids.length) {
      const err = new Error(
        'Este CPF já está cadastrado como paciente. Vincule o responsável à ficha existente em vez de criar outro cadastro.'
      );
      err.status = 409;
      err.code = 'duplicate_cpf';
      throw err;
    }
    for (const rid of ids) {
      await linkResponsavelPaciente(existing.id, rid);
    }
    if (Array.isArray(req.body?.medico_ids)) {
      await syncPacienteMedicos(existing.id, req.body.medico_ids);
    }
    await attachDualRoleIfSameCpf(existing.id, req.body.cpf);
    return {
      status: 200,
      body: {
        id: existing.id,
        vinculado: true,
        message: `Paciente ${existing.nome} já existia e foi vinculado ao responsável.`,
      },
    };
  },
});

const remedios = createCrudController({
  table: 'remedios',
  recurso: 'remedios',
  menuRota: '/remedios',
  searchable: ['remedios.nome_comercial', 'remedios.principio_ativo', 'remedios.registro_anvisa'],
  requiredCreate: [
    'nome_comercial',
    'principio_ativo',
    'quantidade_administrar',
    'quantidade_estoque',
    'indicacao',
    'farmacia_id',
    'valor',
  ],
  optional: [
    'laboratorio',
    'numero_controle_pessoal',
    'hora_exata',
    'concentracao',
    'forma_farmaceutica',
    'registro_anvisa',
    'instrucoes_uso',
    'uso_continuo',
    'periodo_horario',
    'status',
    'medico_prescritor_id',
    'farmacia_id',
    'valor',
    'paciente_id',
    'consumo_diario',
    'intervalo_horas',
  ],
  normalize: (p) => {
    const n = { ...p };
    if (!n.status) n.status = 'ativo';
    if (!n.forma_farmaceutica) n.forma_farmaceutica = 'comprimido';
    n.uso_continuo = n.uso_continuo === true || n.uso_continuo === 'true' || n.uso_continuo === 1;
    if (!n.periodo_horario) n.periodo_horario = 'manha';
    if (n.quantidade_estoque != null && n.quantidade_estoque !== '') {
      n.quantidade_estoque = Number(n.quantidade_estoque);
    }
    if (n.medico_prescritor_id === '' || n.medico_prescritor_id == null) {
      n.medico_prescritor_id = null;
    } else {
      n.medico_prescritor_id = Number(n.medico_prescritor_id);
    }
    if (n.farmacia_id === '' || n.farmacia_id == null) n.farmacia_id = null;
    else n.farmacia_id = Number(n.farmacia_id);
    if (n.paciente_id === '' || n.paciente_id == null) n.paciente_id = null;
    else n.paciente_id = Number(n.paciente_id);
    if (n.valor != null && n.valor !== '') n.valor = Number(n.valor);
    if (n.consumo_diario != null && n.consumo_diario !== '') n.consumo_diario = Number(n.consumo_diario);
    if (n.intervalo_horas === '' || n.intervalo_horas == null) n.intervalo_horas = null;
    else n.intervalo_horas = Number(n.intervalo_horas);
    return n;
  },
  selectExtra: ', mp.nome AS medico_prescritor_nome, f.nome_fantasia AS farmacia_nome',
  joins:
    'LEFT JOIN medicos mp ON mp.id = remedios.medico_prescritor_id LEFT JOIN farmacias f ON f.id = remedios.farmacia_id',
  afterSave: async (id) => {
    const rows = await query('SELECT * FROM remedios WHERE id = :id LIMIT 1', { id });
    if (rows[0]?.paciente_id) {
      await syncRemedioAgenda(rows[0]);
    }
  },
  beforeDelete: async (id) => {
    await clearFutureDoses(id);
  },
});

function parseQuantidadeDecrement(value) {
  if (value == null || value === '') return 1;
  const n = Number(value);
  if (!Number.isNaN(n) && n > 0) return n;
  const match = String(value).match(/[\d]+([.,]\d+)?/);
  if (match) {
    const parsed = Number(match[0].replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 1;
}

async function administrarRemedio(req, res, next) {
  try {
    const remedioId = Number(req.params.id);
    const { paciente_id, quantidade, observacoes } = req.body || {};

    const rows = await query('SELECT * FROM remedios WHERE id = :id LIMIT 1', { id: remedioId });
    if (!rows[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Medicamento não encontrado.' });
    }
    const remedio = rows[0];

    // Idempotente no dia: não baixa estoque duas vezes
    const jaHoje = await query(
      `SELECT id FROM medicamento_administracoes
       WHERE remedio_id = :remedioId
         AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
       LIMIT 1`,
      { remedioId }
    );
    if (jaHoje[0]) {
      return res.json({
        id: jaHoje[0].id,
        ok: true,
        already: true,
        quantidade_estoque: Number(remedio.quantidade_estoque || 0),
      });
    }

    const qtyLabel = quantidade ?? remedio.quantidade_administrar;
    const decrement = parseQuantidadeDecrement(qtyLabel);

    const adminResult = await query(
      `INSERT INTO medicamento_administracoes
        (remedio_id, paciente_id, usuario_id, quantidade, observacoes)
       VALUES
        (:remedio_id, :paciente_id, :usuario_id, :quantidade, :observacoes)`,
      {
        remedio_id: remedioId,
        paciente_id: paciente_id != null && paciente_id !== '' ? Number(paciente_id) : null,
        usuario_id: req.user.id,
        quantidade: qtyLabel != null ? String(qtyLabel) : null,
        observacoes: observacoes ?? null,
      }
    );

    await query(
      `UPDATE remedios
       SET quantidade_estoque = GREATEST(0, COALESCE(quantidade_estoque, 0) - :dec)
       WHERE id = :id`,
      { dec: decrement, id: remedioId }
    );

    const updated = await query(
      'SELECT quantidade_estoque FROM remedios WHERE id = :id LIMIT 1',
      { id: remedioId }
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'remedios',
      recursoId: remedioId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: {
        acao: 'administrar',
        administracao_id: adminResult.insertId,
        quantidade: qtyLabel,
        decremento_estoque: decrement,
      },
    });

    return res.status(201).json({
      id: adminResult.insertId,
      ok: true,
      quantidade_estoque: Number(updated[0]?.quantidade_estoque || 0),
    });
  } catch (err) {
    return next(err);
  }
}

async function listAdministracoesHoje(req, res, next) {
  try {
    const rows = await query(
      `SELECT remedio_id, MAX(id) AS id
       FROM medicamento_administracoes
       WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date
             = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
       GROUP BY remedio_id`
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  medicos,
  pacientes,
  remedios,
  administrarRemedio,
  listAdministracoesHoje,
};
