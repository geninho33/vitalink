const { createCrudController, addressNormalize } = require('../utils/crudFactory');

const addressFields = [
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
];

const cuidadores = createCrudController({
  table: 'cuidadores',
  recurso: 'cuidadores',
  menuRota: '/cuidadores',
  searchable: ['cuidadores.nome', 'cuidadores.cpf', 'cuidadores.email'],
  requiredCreate: [
    'nome',
    'cpf',
    'telefone_principal',
    'cep',
    'logradouro',
    'numero',
    'bairro',
    'cidade',
    'uf',
  ],
  optional: [
    'usuario_id',
    'empresa_cuidadora_id',
    'telefone_secundario',
    'email',
    'foto_url',
    'turno',
    'especialidade',
    'complemento',
    'observacoes',
    'status',
    ...addressFields.filter((f) => !['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf'].includes(f)),
  ],
  normalize: (p) => {
    const n = addressNormalize({ ...p });
    if (!n.status) n.status = 'ativo';
    return n;
  },
  selectExtra: ', u.email AS usuario_email, u.nome AS usuario_nome',
  joins: 'LEFT JOIN usuarios u ON u.id = cuidadores.usuario_id',
});

const responsaveis = createCrudController({
  table: 'responsaveis',
  recurso: 'responsaveis',
  menuRota: '/responsaveis',
  searchable: ['responsaveis.nome', 'responsaveis.cpf', 'responsaveis.email'],
  requiredCreate: [
    'nome',
    'cpf',
    'telefone_principal',
    'cep',
    'logradouro',
    'numero',
    'bairro',
    'cidade',
    'uf',
  ],
  optional: [
    'usuario_id',
    'telefone_secundario',
    'email',
    'foto_url',
    'grau_parentesco',
    'complemento',
    'observacoes',
    'status',
  ],
  normalize: (p) => {
    const n = addressNormalize({ ...p });
    if (!n.status) n.status = 'ativo';
    return n;
  },
  selectExtra: ', u.email AS usuario_email, u.nome AS usuario_nome',
  joins: 'LEFT JOIN usuarios u ON u.id = responsaveis.usuario_id',
});

module.exports = { cuidadores, responsaveis };
