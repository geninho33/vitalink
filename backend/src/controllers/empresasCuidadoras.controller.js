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

const empresasCuidadoras = createCrudController({
  table: 'empresas_cuidadoras',
  recurso: 'empresas_cuidadoras',
  menuRota: '/empresas-cuidadoras',
  searchable: [
    'empresas_cuidadoras.nome_fantasia',
    'empresas_cuidadoras.razao_social',
    'empresas_cuidadoras.cnpj',
    'empresas_cuidadoras.pessoa_responsavel',
  ],
  requiredCreate: ['nome_fantasia'],
  optional: [
    'razao_social',
    'cnpj',
    'telefone',
    'email',
    'pessoa_responsavel',
    ...addressFields,
    'status',
  ],
  normalize: (p) => {
    const n = addressNormalize({ ...p });
    if (!n.status) n.status = 'ativo';
    if (n.cnpj != null && String(n.cnpj).trim() === '') n.cnpj = null;
    if (n.razao_social != null && String(n.razao_social).trim() === '') n.razao_social = null;
    return n;
  },
});

module.exports = empresasCuidadoras;
