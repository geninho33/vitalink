const { createCrudController, addressNormalize } = require('../utils/crudFactory');

const medicos = createCrudController({
  table: 'medicos',
  recurso: 'medicos',
  menuRota: '/medicos',
  searchable: ['medicos.nome', 'medicos.crm', 'medicos.especialidade'],
  requiredCreate: ['hospital_clinica_id', 'nome', 'crm', 'uf_crm', 'telefone_principal'],
  optional: [
    'usuario_id',
    'cpf',
    'especialidade',
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
  selectExtra: ', h.nome_fantasia AS hospital_nome',
  joins: 'LEFT JOIN hospitais_clinicas h ON h.id = medicos.hospital_clinica_id',
});

const pacientes = createCrudController({
  table: 'pacientes',
  recurso: 'pacientes',
  menuRota: '/pacientes',
  searchable: ['pacientes.nome', 'pacientes.cpf', 'pacientes.convenio_nome'],
  requiredCreate: ['nome', 'data_nascimento', 'cpf'],
  optional: [
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
    return n;
  },
  selectExtra: `,
    r.nome AS responsavel_nome,
    c.nome AS cuidador_nome,
    m.nome AS medico_nome,
    af.caminho AS foto_caminho,
    acf.caminho AS convenio_frente_caminho,
    acv.caminho AS convenio_verso_caminho`,
  joins: `
    LEFT JOIN responsaveis r ON r.id = pacientes.responsavel_id
    LEFT JOIN cuidadores c ON c.id = pacientes.cuidador_id
    LEFT JOIN medicos m ON m.id = pacientes.medico_id
    LEFT JOIN arquivos af ON af.id = pacientes.foto_arquivo_id
    LEFT JOIN arquivos acf ON acf.id = pacientes.convenio_frente_arquivo_id
    LEFT JOIN arquivos acv ON acv.id = pacientes.convenio_verso_arquivo_id`,
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
    'uso_continuo',
    'periodo_horario',
    'status',
  ],
  normalize: (p) => {
    const n = { ...p };
    if (!n.status) n.status = 'ativo';
    if (!n.forma_farmaceutica) n.forma_farmaceutica = 'comprimido';
    n.uso_continuo = n.uso_continuo === true || n.uso_continuo === 'true' || n.uso_continuo === 1;
    if (!n.periodo_horario) n.periodo_horario = 'manha';
    return n;
  },
});

module.exports = { medicos, pacientes, remedios };
