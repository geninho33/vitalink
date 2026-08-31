const { createCrudController, addressNormalize } = require('../utils/crudFactory');
const {
  hospitaisScopeForCrud,
  farmaciasScopeForCrud,
} = require('../services/pacienteScope.service');
const { onlyDigits, isValidCnpj, validationError } = require('../utils/validation');

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
  'tipo_estabelecimento',
  'tipo_documento',
  'documento',
  'telefone_principal',
  'telefone_secundario',
  'whatsapp',
  'email',
  ...addressFields,
  'observacoes',
  'status',
  'usuario_id',
];

function makeEstablishment(table, recurso, menuRota) {
  return createCrudController({
    table,
    recurso,
    menuRota,
    searchable: [
      `${table}.nome_fantasia`,
      `${table}.razao_social`,
      `${table}.documento`,
      `${table}.bairro`,
      `${table}.cidade`,
      `${table}.uf`,
      `${table}.logradouro`,
    ],
    // Nome fantasia priorizado; CNPJ/Razão Social opcionais (SDD Onda 0)
    requiredCreate: [
      'nome_fantasia',
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
          'nome_fantasia',
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
      if (!n.tipo_estabelecimento) n.tipo_estabelecimento = 'clinica';
      if (!n.status) n.status = 'ativo';
      // Evita UNIQUE/CHECK com string vazia
      if (n.documento != null && String(n.documento).trim() === '') n.documento = null;
      if (n.razao_social != null && String(n.razao_social).trim() === '') n.razao_social = null;
      if (n.documento) {
        n.documento = onlyDigits(n.documento);
        if ((n.tipo_documento || 'cnpj') === 'cnpj' && n.documento && !isValidCnpj(n.documento)) {
          validationError('CNPJ inválido.');
        }
      }
      // WhatsApp: aceita campo dedicado ou legado telefone_secundario
      if ((!n.whatsapp || String(n.whatsapp).trim() === '') && n.telefone_secundario) {
        n.whatsapp = n.telefone_secundario;
      }
      if (n.whatsapp != null && String(n.whatsapp).trim() === '') n.whatsapp = null;
      return n;
    },
    buildScope: table === 'hospitais_clinicas' ? hospitaisScopeForCrud : farmaciasScopeForCrud,
  });
}

const farmacias = createCrudController({
  table: 'farmacias',
  recurso: 'farmacias',
  menuRota: '/farmacias',
  searchable: ['farmacias.nome_fantasia', 'farmacias.razao_social', 'farmacias.documento', 'farmacias.bairro', 'farmacias.cidade', 'farmacias.uf'],
  requiredCreate: [],
  optional: establishmentFields,
  normalize: (p) => {
    const n = addressNormalize({ ...p });
    if (!n.tipo_documento) n.tipo_documento = 'cnpj';
    if (!n.status) n.status = 'ativo';
    if (n.documento != null && String(n.documento).trim() === '') n.documento = null;
    if (n.razao_social != null && String(n.razao_social).trim() === '') n.razao_social = null;
    if (n.documento) {
      n.documento = onlyDigits(n.documento);
      if ((n.tipo_documento || 'cnpj') === 'cnpj' && n.documento && !isValidCnpj(n.documento)) {
        validationError('CNPJ inválido.');
      }
    }
    if ((!n.whatsapp || String(n.whatsapp).trim() === '') && n.telefone_secundario) {
      n.whatsapp = n.telefone_secundario;
    }
    if (n.whatsapp != null && String(n.whatsapp).trim() === '') n.whatsapp = null;
    return n;
  },
  buildScope: farmaciasScopeForCrud,
});

module.exports = {
  hospitais: makeEstablishment('hospitais_clinicas', 'hospitais', '/hospitais'),
  farmacias,
};
