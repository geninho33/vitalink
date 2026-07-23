const { createCrudController, addressNormalize } = require('../utils/crudFactory');

const medicos = createCrudController({
  table: 'medicos',
  recurso: 'medicos',
  menuRota: '/medicos',
  searchable: ['medicos.nome', 'medicos.crm', 'medicos.especialidade'],
  requiredCreate: ['hospital_clinica_id', 'nome', 'crm', 'uf_crm', 'telefone_principal'],
  optional: [
    'usuario_id',
    'especialidade',
    'telefone_secundario',
    'email',
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
  selectExtra: ', h.nome_fantasia AS hospital_nome',
  joins: 'LEFT JOIN hospitais_clinicas h ON h.id = medicos.hospital_clinica_id',
});

const pacientes = createCrudController({
  table: 'pacientes',
  recurso: 'pacientes',
  menuRota: '/pacientes',
  searchable: ['pacientes.nome', 'pacientes.cpf', 'pacientes.diagnostico_principal'],
  requiredCreate: ['nome', 'data_nascimento', 'cpf', 'diagnostico_principal'],
  optional: [
    'alergias',
    'tipo_sanguineo',
    'foto_url',
    'telefone_principal',
    'email',
    'convenio_nome',
    'convenio_numero',
    'convenio_validade',
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
    return n;
  },
  selectExtra: `,
    r.nome AS responsavel_nome,
    c.nome AS cuidador_nome,
    m.nome AS medico_nome`,
  joins: `
    LEFT JOIN responsaveis r ON r.id = pacientes.responsavel_id
    LEFT JOIN cuidadores c ON c.id = pacientes.cuidador_id
    LEFT JOIN medicos m ON m.id = pacientes.medico_id`,
});

const remedios = createCrudController({
  table: 'remedios',
  recurso: 'remedios',
  menuRota: '/remedios',
  searchable: ['remedios.nome_comercial', 'remedios.principio_ativo', 'remedios.registro_anvisa'],
  requiredCreate: ['nome_comercial', 'principio_ativo'],
  optional: [
    'concentracao',
    'forma_farmaceutica',
    'registro_anvisa',
    'instrucoes_uso',
    'status',
  ],
  normalize: (p) => {
    const n = { ...p };
    if (!n.status) n.status = 'ativo';
    if (!n.forma_farmaceutica) n.forma_farmaceutica = 'comprimido';
    return n;
  },
});

module.exports = { medicos, pacientes, remedios };
