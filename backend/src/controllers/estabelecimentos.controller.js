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

const establishmentFields = [
  'razao_social',
  'nome_fantasia',
  'tipo_documento',
  'documento',
  'telefone_principal',
  'telefone_secundario',
  'email',
  ...addressFields,
  'observacoes',
  'status',
];

function makeEstablishment(table, recurso, menuRota) {
  return createCrudController({
    table,
    recurso,
    menuRota,
    searchable: [`${table}.nome_fantasia`, `${table}.razao_social`, `${table}.documento`],
    requiredCreate: [
      'razao_social',
      'nome_fantasia',
      'documento',
      'telefone_principal',
      'cep',
      'logradouro',
      'numero',
      'bairro',
      'cidade',
      'uf',
    ],
    optional: establishmentFields.filter(
      (f) =>
        ![
          'razao_social',
          'nome_fantasia',
          'documento',
          'telefone_principal',
          'cep',
          'logradouro',
          'numero',
          'bairro',
          'cidade',
          'uf',
        ].includes(f)
    ),
    normalize: (p) => {
      const n = addressNormalize({ ...p });
      if (!n.tipo_documento) n.tipo_documento = 'cnpj';
      if (!n.status) n.status = 'ativo';
      return n;
    },
  });
}

module.exports = {
  hospitais: makeEstablishment('hospitais_clinicas', 'hospitais', '/hospitais'),
  farmacias: makeEstablishment('farmacias', 'farmacias', '/farmacias'),
};
