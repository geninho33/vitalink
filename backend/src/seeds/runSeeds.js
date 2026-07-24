/**
 * VitaLink — Seeder de massa sintética (LGPD / dados fictícios)
 *
 * Uso:
 *   node src/seeds/runSeeds.js
 *   npm run db:seed
 *   ./deploy.sh seed   (via Docker)
 *
 * Idempotente: remove registros marcados com o domínio @seed.vitalink.local
 * e tags [VITALINK_SEED] antes de reinserir.
 *
 * Senha padrão dos usuários seed: Seed@Vitalink1
 */
require('dotenv').config();

const { faker } = require('@faker-js/faker/locale/pt_BR');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

faker.seed(20260724);

const SEED_TAG = '[VITALINK_SEED]';
const SEED_DOMAIN = 'seed.vitalink.local';
const SEED_PASSWORD = 'Seed@Vitalink1';

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'vitalink',
  password: process.env.DB_PASSWORD || 'vitalink_secret',
  database: process.env.DB_NAME || 'vitalink',
};

const REMEDIOS = [
  { nome: 'Donepezila', principio: 'Donepezila', conc: '10mg', forma: 'comprimido' },
  { nome: 'Memantina', principio: 'Memantina', conc: '10mg', forma: 'comprimido' },
  { nome: 'Losartana', principio: 'Losartana potássica', conc: '50mg', forma: 'comprimido' },
  { nome: 'Metformina', principio: 'Cloridrato de metformina', conc: '850mg', forma: 'comprimido' },
  { nome: 'Quetiapina', principio: 'Fumarato de quetiapina', conc: '25mg', forma: 'comprimido' },
  { nome: 'Omeprazol', principio: 'Omeprazol', conc: '20mg', forma: 'capsula' },
  { nome: 'Sinvastatina', principio: 'Sinvastatina', conc: '20mg', forma: 'comprimido' },
  { nome: 'AAS', principio: 'Ácido acetilsalicílico', conc: '100mg', forma: 'comprimido' },
  { nome: 'Levotiroxina', principio: 'Levotiroxina sódica', conc: '50mcg', forma: 'comprimido' },
  { nome: 'Anlodipino', principio: 'Besilato de anlodipino', conc: '5mg', forma: 'comprimido' },
  { nome: 'Gabapentina', principio: 'Gabapentina', conc: '300mg', forma: 'capsula' },
  { nome: 'Sertralina', principio: 'Cloridrato de sertralina', conc: '50mg', forma: 'comprimido' },
  { nome: 'Insulina NPH', principio: 'Insulina humana NPH', conc: '100UI/ml', forma: 'injecao' },
  { nome: 'Carbonato de Cálcio', principio: 'Carbonato de cálcio', conc: '500mg', forma: 'comprimido' },
  { nome: 'Colecalciferol', principio: 'Vitamina D3', conc: '7000UI', forma: 'gotas' },
];

const DIAGNOSTICOS = [
  'Doença de Alzheimer',
  'Doença de Parkinson',
  'Hipertensão arterial sistêmica',
  'Diabetes mellitus tipo 2',
  'Osteoporose',
  'Insuficiência cardíaca congestiva',
  'DPOC',
  'Demência vascular',
];

const PARENTESCOS = ['Filho(a)', 'Cônjuge', 'Neto(a)', 'Irmão(ã)', 'Sobrinho(a)'];
const TURNOS = ['Manhã', 'Tarde', 'Noite', 'Plantão 12x36', 'Integral'];
const ESPECIALIDADES_CUIDADOR = ['Geriatria', 'Cuidados paliativos', 'Demências', 'Mobilidade', 'Apoio domiciliar'];
const ESPECIALIDADES_MEDICO = [
  'Geriatria',
  'Neurologia',
  'Cardiologia',
  'Clínica Geral',
  'Endocrinologia',
  'Ortopedia',
];
const SANGUE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'NI'];
const UFS = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'SC', 'PE'];

const ENDERECOS_BR = [
  { cep: '01310100', logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
  { cep: '22041080', logradouro: 'Avenida Atlântica', bairro: 'Copacabana', cidade: 'Rio de Janeiro', uf: 'RJ' },
  { cep: '30130100', logradouro: 'Avenida Afonso Pena', bairro: 'Centro', cidade: 'Belo Horizonte', uf: 'MG' },
  { cep: '80010000', logradouro: 'Rua XV de Novembro', bairro: 'Centro', cidade: 'Curitiba', uf: 'PR' },
  { cep: '90010150', logradouro: 'Rua dos Andradas', bairro: 'Centro Histórico', cidade: 'Porto Alegre', uf: 'RS' },
  { cep: '40020000', logradouro: 'Avenida Sete de Setembro', bairro: 'Centro', cidade: 'Salvador', uf: 'BA' },
  { cep: '88015200', logradouro: 'Rua Felipe Schmidt', bairro: 'Centro', cidade: 'Florianópolis', uf: 'SC' },
  { cep: '50010000', logradouro: 'Avenida Guararapes', bairro: 'Santo Antônio', cidade: 'Recife', uf: 'PE' },
];

function log(msg) {
  console.log(`[vitalink-seed] ${msg}`);
}

function onlyDigits(value, len) {
  const d = String(value || '').replace(/\D/g, '');
  return len ? d.padStart(len, '0').slice(0, len) : d;
}

function fakeCnpj(seq) {
  // CNPJ sintético 14 dígitos (não válido na Receita — apenas único)
  return onlyDigits(`00${String(100000000000 + seq).slice(0, 12)}`, 14);
}

function fakeCpf(seq) {
  return onlyDigits(`9${String(10000000000 + seq).slice(0, 10)}`, 11);
}

function phone(seq) {
  return `(11) 9${String(80000000 + seq).padStart(8, '0')}`;
}

function pickAddr(i) {
  return ENDERECOS_BR[i % ENDERECOS_BR.length];
}

function sqlTs(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '+00');
}

function combineDateTime(date, timeStr) {
  const d = date.toISOString().slice(0, 10);
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${d}T${t}`);
}

async function main() {
  const client = new Client(cfg);
  await client.connect();
  log(`Conectado em ${cfg.host}:${cfg.port}/${cfg.database}`);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  try {
    await client.query('BEGIN');

    log('Limpando massa seed anterior (idempotência)...');
    await cleanupSeed(client);

    log('Inserindo hospitais (5)...');
    const hospitalIds = await seedHospitais(client);

    log('Inserindo farmácias (5)...');
    await seedFarmacias(client);

    log('Inserindo remédios (15)...');
    const remedioIds = await seedRemedios(client);

    log('Inserindo médicos (20) + usuários...');
    const medicoIds = await seedMedicos(client, hospitalIds, passwordHash);

    log('Inserindo cuidadores (10) + usuários...');
    const cuidadorIds = await seedCuidadores(client, passwordHash);

    log('Inserindo responsáveis (30) + usuários...');
    const responsavelIds = await seedResponsaveis(client, passwordHash);

    log('Inserindo pacientes (20) + anamneses...');
    const pacienteIds = await seedPacientes(client, {
      responsavelIds,
      cuidadorIds,
      medicoIds,
    });

    log('Inserindo consultas (>=40) + agenda...');
    await seedConsultas(client, { pacienteIds, medicoIds, hospitalIds });

    log('Inserindo rotinas, execuções + agenda...');
    await seedRotinas(client, { pacienteIds, remedioIds });

    await client.query('COMMIT');

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM hospitais_clinicas WHERE observacoes LIKE $1) AS hospitais,
        (SELECT COUNT(*) FROM farmacias WHERE observacoes LIKE $1) AS farmacias,
        (SELECT COUNT(*) FROM remedios WHERE instrucoes_uso LIKE $1) AS remedios,
        (SELECT COUNT(*) FROM medicos WHERE observacoes LIKE $1) AS medicos,
        (SELECT COUNT(*) FROM cuidadores WHERE observacoes LIKE $1) AS cuidadores,
        (SELECT COUNT(*) FROM responsaveis WHERE observacoes LIKE $1) AS responsaveis,
        (SELECT COUNT(*) FROM pacientes WHERE observacoes LIKE $1) AS pacientes,
        (SELECT COUNT(*) FROM paciente_anamnese pa
           INNER JOIN pacientes p ON p.id = pa.paciente_id
          WHERE p.observacoes LIKE $1) AS anamneses,
        (SELECT COUNT(*) FROM consultas c
           INNER JOIN pacientes p ON p.id = c.paciente_id
          WHERE p.observacoes LIKE $1) AS consultas,
        (SELECT COUNT(*) FROM atendimentos_rotina r
           INNER JOIN pacientes p ON p.id = r.paciente_id
          WHERE p.observacoes LIKE $1) AS rotinas,
        (SELECT COUNT(*) FROM agenda_eventos a
           INNER JOIN pacientes p ON p.id = a.paciente_id
          WHERE p.observacoes LIKE $1) AS agenda
    `, [`%${SEED_TAG}%`]);

    log('Carga concluída com sucesso.');
    console.log(JSON.stringify(counts.rows[0], null, 2));
    log(`Senha dos usuários seed: ${SEED_PASSWORD}`);
    log(`Exemplo login: medico01@${SEED_DOMAIN} / ${SEED_PASSWORD}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[vitalink-seed] ERRO:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

async function cleanupSeed(client) {
  // Remove por pacientes seed (cascade em anamnese/consultas/rotina/agenda via FKs)
  await client.query(`
    DELETE FROM agenda_eventos
    WHERE paciente_id IN (SELECT id FROM pacientes WHERE observacoes LIKE $1)
  `, [`%${SEED_TAG}%`]);

  await client.query(`
    DELETE FROM atendimento_execucoes
    WHERE paciente_id IN (SELECT id FROM pacientes WHERE observacoes LIKE $1)
  `, [`%${SEED_TAG}%`]);

  await client.query(`
    DELETE FROM atendimentos_rotina
    WHERE paciente_id IN (SELECT id FROM pacientes WHERE observacoes LIKE $1)
  `, [`%${SEED_TAG}%`]);

  await client.query(`
    DELETE FROM consultas
    WHERE paciente_id IN (SELECT id FROM pacientes WHERE observacoes LIKE $1)
  `, [`%${SEED_TAG}%`]);

  await client.query(`
    DELETE FROM paciente_anamnese
    WHERE paciente_id IN (SELECT id FROM pacientes WHERE observacoes LIKE $1)
  `, [`%${SEED_TAG}%`]);

  await client.query(`DELETE FROM pacientes WHERE observacoes LIKE $1`, [`%${SEED_TAG}%`]);

  await client.query(`DELETE FROM medicos WHERE observacoes LIKE $1`, [`%${SEED_TAG}%`]);
  await client.query(`DELETE FROM cuidadores WHERE observacoes LIKE $1`, [`%${SEED_TAG}%`]);
  await client.query(`DELETE FROM responsaveis WHERE observacoes LIKE $1`, [`%${SEED_TAG}%`]);

  await client.query(`DELETE FROM usuarios WHERE email LIKE $1`, [`%@${SEED_DOMAIN}`]);

  await client.query(`DELETE FROM farmacias WHERE observacoes LIKE $1`, [`%${SEED_TAG}%`]);
  await client.query(`DELETE FROM hospitais_clinicas WHERE observacoes LIKE $1`, [`%${SEED_TAG}%`]);
  await client.query(`DELETE FROM remedios WHERE instrucoes_uso LIKE $1`, [`%${SEED_TAG}%`]);
}

async function seedHospitais(client) {
  const ids = [];
  const nomes = [
    'Hospital VitaLink Centro',
    'Clínica Longevidade Norte',
    'Instituto Cuidado Integral',
    'Hospital São Vicente Seed',
    'Centro Médico Horizonte',
  ];
  for (let i = 0; i < 5; i += 1) {
    const addr = pickAddr(i);
    const res = await client.query(
      `INSERT INTO hospitais_clinicas
        (razao_social, nome_fantasia, tipo_documento, documento, telefone_principal,
         telefone_secundario, email, cep, logradouro, numero, complemento, bairro, cidade, uf,
         observacoes, status)
       VALUES ($1,$2,'cnpj',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'ativo')
       RETURNING id`,
      [
        `${nomes[i]} LTDA`,
        nomes[i],
        fakeCnpj(100 + i),
        phone(100 + i),
        phone(200 + i),
        `hospital${String(i + 1).padStart(2, '0')}@${SEED_DOMAIN}`,
        addr.cep,
        addr.logradouro,
        String(100 + i * 11),
        'Sala Admin',
        addr.bairro,
        addr.cidade,
        addr.uf,
        `${SEED_TAG} Estabelecimento sintético`,
      ]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}

async function seedFarmacias(client) {
  const nomes = [
    'Farmácia Cuidado Diário',
    'Drogaria Bem Estar Seed',
    'Farmácia Popular Longeva',
    'Drogasil Vita Simulada',
    'Farmácia Horizonte Saúde',
  ];
  for (let i = 0; i < 5; i += 1) {
    const addr = pickAddr(i + 2);
    await client.query(
      `INSERT INTO farmacias
        (razao_social, nome_fantasia, tipo_documento, documento, telefone_principal,
         telefone_secundario, email, cep, logradouro, numero, complemento, bairro, cidade, uf,
         observacoes, status)
       VALUES ($1,$2,'cnpj',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'ativo')`,
      [
        `${nomes[i]} LTDA`,
        nomes[i],
        fakeCnpj(200 + i),
        phone(300 + i),
        null,
        `farmacia${String(i + 1).padStart(2, '0')}@${SEED_DOMAIN}`,
        addr.cep,
        addr.logradouro,
        String(50 + i * 7),
        null,
        addr.bairro,
        addr.cidade,
        addr.uf,
        `${SEED_TAG} Farmácia sintética`,
      ]
    );
  }
}

async function seedRemedios(client) {
  const ids = [];
  for (const r of REMEDIOS) {
    const res = await client.query(
      `INSERT INTO remedios
        (nome_comercial, principio_ativo, concentracao, forma_farmaceutica,
         registro_anvisa, instrucoes_uso, status)
       VALUES ($1,$2,$3,$4,$5,$6,'ativo')
       RETURNING id`,
      [
        r.nome,
        r.principio,
        r.conc,
        r.forma,
        `SEED${faker.string.numeric(8)}`,
        `${SEED_TAG} Uso contínuo simulado — ${r.nome} ${r.conc}`,
      ]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}

async function insertUsuario(client, { nome, email, perfilId, passwordHash }) {
  const res = await client.query(
    `INSERT INTO usuarios (nome, email, senha_hash, status, perfil_id)
     VALUES ($1,$2,$3,'ativo',$4)
     RETURNING id`,
    [nome, email, passwordHash, perfilId]
  );
  return res.rows[0].id;
}

async function seedMedicos(client, hospitalIds, passwordHash) {
  const ids = [];
  for (let i = 0; i < 20; i += 1) {
    const nome = faker.person.fullName();
    const email = `medico${String(i + 1).padStart(2, '0')}@${SEED_DOMAIN}`;
    const usuarioId = await insertUsuario(client, {
      nome,
      email,
      perfilId: 2, // Médico
      passwordHash,
    });
    const addr = pickAddr(i);
    const uf = UFS[i % UFS.length];
    const res = await client.query(
      `INSERT INTO medicos
        (usuario_id, hospital_clinica_id, nome, crm, uf_crm, especialidade,
         telefone_principal, telefone_secundario, email, cep, logradouro, numero,
         complemento, bairro, cidade, uf, observacoes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'ativo')
       RETURNING id`,
      [
        usuarioId,
        hospitalIds[i % hospitalIds.length],
        nome,
        String(100000 + i),
        uf,
        ESPECIALIDADES_MEDICO[i % ESPECIALIDADES_MEDICO.length],
        phone(400 + i),
        phone(500 + i),
        email,
        addr.cep,
        addr.logradouro,
        String(10 + i),
        null,
        addr.bairro,
        addr.cidade,
        addr.uf,
        `${SEED_TAG} Médico sintético`,
      ]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}

async function seedCuidadores(client, passwordHash) {
  const ids = [];
  for (let i = 0; i < 10; i += 1) {
    const nome = faker.person.fullName();
    const email = `cuidador${String(i + 1).padStart(2, '0')}@${SEED_DOMAIN}`;
    const usuarioId = await insertUsuario(client, {
      nome,
      email,
      perfilId: 4, // Cuidador
      passwordHash,
    });
    const addr = pickAddr(i + 1);
    const res = await client.query(
      `INSERT INTO cuidadores
        (usuario_id, nome, cpf, telefone_principal, telefone_secundario, email, foto_url,
         turno, especialidade, cep, logradouro, numero, complemento, bairro, cidade, uf,
         observacoes, status)
       VALUES ($1,$2,$3,$4,$5,$6,NULL,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'ativo')
       RETURNING id`,
      [
        usuarioId,
        nome,
        fakeCpf(300 + i),
        phone(600 + i),
        null,
        email,
        TURNOS[i % TURNOS.length],
        ESPECIALIDADES_CUIDADOR[i % ESPECIALIDADES_CUIDADOR.length],
        addr.cep,
        addr.logradouro,
        String(20 + i),
        'Apto seed',
        addr.bairro,
        addr.cidade,
        addr.uf,
        `${SEED_TAG} Cuidador sintético`,
      ]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}

async function seedResponsaveis(client, passwordHash) {
  const ids = [];
  for (let i = 0; i < 30; i += 1) {
    const nome = faker.person.fullName();
    const email = `responsavel${String(i + 1).padStart(2, '0')}@${SEED_DOMAIN}`;
    const usuarioId = await insertUsuario(client, {
      nome,
      email,
      perfilId: 5, // Responsável
      passwordHash,
    });
    const addr = pickAddr(i + 3);
    const res = await client.query(
      `INSERT INTO responsaveis
        (usuario_id, nome, cpf, telefone_principal, telefone_secundario, email, foto_url,
         grau_parentesco, cep, logradouro, numero, complemento, bairro, cidade, uf,
         observacoes, status)
       VALUES ($1,$2,$3,$4,$5,$6,NULL,$7,$8,$9,$10,$11,$12,$13,$14,$15,'ativo')
       RETURNING id`,
      [
        usuarioId,
        nome,
        fakeCpf(400 + i),
        phone(700 + i),
        null,
        email,
        PARENTESCOS[i % PARENTESCOS.length],
        addr.cep,
        addr.logradouro,
        String(30 + i),
        null,
        addr.bairro,
        addr.cidade,
        addr.uf,
        `${SEED_TAG} Responsável sintético`,
      ]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}

async function seedPacientes(client, { responsavelIds, cuidadorIds, medicoIds }) {
  const ids = [];
  for (let i = 0; i < 20; i += 1) {
    const idade = 65 + (i % 26); // 65–90
    const nasc = faker.date.birthdate({ min: idade, max: idade, mode: 'age' });
    const nome = faker.person.fullName();
    const addr = pickAddr(i);
    const diagnostico = DIAGNOSTICOS[i % DIAGNOSTICOS.length];
    const res = await client.query(
      `INSERT INTO pacientes
        (nome, data_nascimento, cpf, diagnostico_principal, alergias, tipo_sanguineo,
         telefone_principal, email, convenio_nome, convenio_numero, convenio_validade,
         responsavel_id, cuidador_id, medico_id, cep, logradouro, numero, complemento,
         bairro, cidade, uf, observacoes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'ativo')
       RETURNING id`,
      [
        nome,
        nasc.toISOString().slice(0, 10),
        fakeCpf(500 + i),
        diagnostico,
        i % 3 === 0 ? 'Dipirona; frutos do mar (simulado)' : 'Sem alergias conhecidas (simulado)',
        SANGUE[i % SANGUE.length],
        phone(800 + i),
        `paciente${String(i + 1).padStart(2, '0')}@${SEED_DOMAIN}`,
        'Convênio Seed Saúde',
        `SEED-${1000 + i}`,
        '2027-12-31',
        responsavelIds[i % responsavelIds.length],
        cuidadorIds[i % cuidadorIds.length],
        medicoIds[i % medicoIds.length],
        addr.cep,
        addr.logradouro,
        String(40 + i),
        null,
        addr.bairro,
        addr.cidade,
        addr.uf,
        `${SEED_TAG} Paciente sintético — ${diagnostico}`,
      ]
    );
    const pacienteId = res.rows[0].id;
    ids.push(pacienteId);

    await client.query(
      `INSERT INTO paciente_anamnese
        (paciente_id, doencas_preexistentes, historico_familiar, cirurgias_anteriores,
         sono, alimentacao, mobilidade, autonomia, medicamentos_contraindicados,
         alergias_alimentares, limitacoes_fisicas_cognitivas, instrucoes_cuidadores,
         episodios_confusao, contato_emergencia_nome, contato_emergencia_telefone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (paciente_id) DO UPDATE SET
         doencas_preexistentes = EXCLUDED.doencas_preexistentes`,
      [
        pacienteId,
        diagnostico,
        'Histórico familiar simulado de hipertensão e demência.',
        i % 4 === 0 ? 'Artroplastia de quadril (simulada)' : 'Nenhuma cirurgia relevante (simulado)',
        'Sono fragmentado; acorda 2–3x por noite (simulado).',
        'Dieta hipossódica; preferência por refeições fracionadas (simulado).',
        i % 2 === 0 ? 'Deambula com apoio de andador' : 'Deambulação assistida parcial',
        i % 3 === 0 ? 'Dependência parcial para AVDs' : 'Autonomia parcial supervisionada',
        'Evitar AINEs sem orientação (simulado)',
        i % 3 === 0 ? 'Frutos do mar' : 'Nenhuma conhecida',
        'Déficit de memória recente; risco de queda (simulado)',
        'Manter rotina de horários; hidratação assistida; supervisão noturna.',
        i % 2 === 0 ? 'Episódios leves ao entardecer (sundowning simulado)' : 'Raros',
        faker.person.fullName(),
        phone(900 + i),
      ]
    );
  }
  return ids;
}

async function upsertAgenda(client, {
  pacienteId,
  tipo,
  origemTabela,
  origemId,
  titulo,
  descricao,
  dataHoraInicio,
  dataHoraFim = null,
  status = 'pendente',
}) {
  await client.query(
    `INSERT INTO agenda_eventos
      (paciente_id, tipo, origem_tabela, origem_id, titulo, descricao,
       data_hora_inicio, data_hora_fim, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (origem_tabela, origem_id) DO UPDATE SET
       titulo = EXCLUDED.titulo,
       status = EXCLUDED.status,
       data_hora_inicio = EXCLUDED.data_hora_inicio`,
    [
      pacienteId,
      tipo,
      origemTabela,
      origemId,
      titulo,
      descricao,
      dataHoraInicio,
      dataHoraFim,
      status,
    ]
  );
}

async function seedConsultas(client, { pacienteIds, medicoIds, hospitalIds }) {
  let n = 0;
  const now = new Date();

  // 25 passadas (concluído) — últimos 90 dias
  for (let i = 0; i < 25; i += 1) {
    const pacienteId = pacienteIds[i % pacienteIds.length];
    const medicoId = medicoIds[i % medicoIds.length];
    const when = new Date(now);
    when.setDate(when.getDate() - (1 + (i * 3) % 90));
    when.setHours(9 + (i % 6), 0, 0, 0);
    const esp = i % 3 === 0 ? 'Fisioterapia' : i % 3 === 1 ? 'Fonoaudiologia' : ESPECIALIDADES_MEDICO[i % ESPECIALIDADES_MEDICO.length];
    const tipoAgenda = esp === 'Fisioterapia' || esp === 'Fonoaudiologia' ? 'sessao' : 'consulta';
    const res = await client.query(
      `INSERT INTO consultas
        (paciente_id, medico_id, profissional_nome, especialidade, local_tipo,
         hospital_clinica_id, local_descricao, data_hora, status, lembrete_minutos,
         anotacoes_pos, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'concluido',60,$9,$10)
       RETURNING id`,
      [
        pacienteId,
        medicoId,
        faker.person.fullName(),
        esp,
        'clinica',
        hospitalIds[i % hospitalIds.length],
        'Consultório seed',
        when,
        'Atendimento realizado (simulado).',
        `${SEED_TAG} Consulta passada`,
      ]
    );
    await upsertAgenda(client, {
      pacienteId,
      tipo: tipoAgenda,
      origemTabela: 'consultas',
      origemId: res.rows[0].id,
      titulo: `${esp}: consulta concluída`,
      descricao: `${SEED_TAG} Timeline`,
      dataHoraInicio: when,
      status: 'concluido',
    });
    n += 1;
  }

  // 20 futuras (pendente) — próximos 30 dias
  for (let i = 0; i < 20; i += 1) {
    const pacienteId = pacienteIds[i % pacienteIds.length];
    const medicoId = medicoIds[(i + 3) % medicoIds.length];
    const when = new Date(now);
    when.setDate(when.getDate() + (1 + (i * 1) % 30));
    when.setHours(10 + (i % 5), 30, 0, 0);
    const esp = i % 3 === 0 ? 'Fisioterapia' : i % 3 === 1 ? 'Fonoaudiologia' : 'Geriatria';
    const tipoAgenda = esp === 'Fisioterapia' || esp === 'Fonoaudiologia' ? 'sessao' : 'consulta';
    const res = await client.query(
      `INSERT INTO consultas
        (paciente_id, medico_id, profissional_nome, especialidade, local_tipo,
         hospital_clinica_id, local_descricao, data_hora, status, lembrete_minutos,
         anotacoes_pos, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendente',60,NULL,$9)
       RETURNING id`,
      [
        pacienteId,
        medicoId,
        faker.person.fullName(),
        esp,
        i % 4 === 0 ? 'domiciliar' : 'clinica',
        hospitalIds[i % hospitalIds.length],
        'Agenda seed futura',
        when,
        `${SEED_TAG} Consulta futura`,
      ]
    );
    await upsertAgenda(client, {
      pacienteId,
      tipo: tipoAgenda,
      origemTabela: 'consultas',
      origemId: res.rows[0].id,
      titulo: `${esp}: agendada`,
      descricao: `${SEED_TAG} Timeline`,
      dataHoraInicio: when,
      status: 'pendente',
    });
    n += 1;
  }

  log(`Consultas inseridas: ${n}`);
}

async function seedRotinas(client, { pacienteIds, remedioIds }) {
  const horarios = ['08:00', '12:00', '18:00', '21:00'];
  const tipos = ['medicamento', 'pressao', 'glicemia', 'medicamento'];

  for (let p = 0; p < pacienteIds.length; p += 1) {
    const pacienteId = pacienteIds[p];
    // 2 rotinas por paciente
    for (let r = 0; r < 2; r += 1) {
      const tipo = tipos[(p + r) % tipos.length];
      const horario = horarios[(p + r) % horarios.length];
      const remedioId = tipo === 'medicamento' ? remedioIds[(p + r) % remedioIds.length] : null;
      const titulo =
        tipo === 'medicamento'
          ? `Medicação ${horario}`
          : tipo === 'pressao'
            ? `Aferição de pressão ${horario}`
            : `Glicemia ${horario}`;

      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 14);

      const rot = await client.query(
        `INSERT INTO atendimentos_rotina
          (paciente_id, tipo, remedio_id, titulo, descricao, horario, dias_semana,
           data_inicio, data_fim, status)
         VALUES ($1,$2,$3,$4,$5,$6::time,'1,2,3,4,5,6,7',$7,NULL,'ativo')
         RETURNING id`,
        [
          pacienteId,
          tipo,
          remedioId,
          titulo,
          `${SEED_TAG} Rotina diária sintética`,
          horario,
          inicio.toISOString().slice(0, 10),
        ]
      );
      const rotinaId = rot.rows[0].id;

      // 7 dias de execuções (passados + hoje)
      for (let d = 0; d < 7; d += 1) {
        const day = new Date();
        day.setDate(day.getDate() - (6 - d));
        const prevista = combineDateTime(day, horario);
        const isPast = prevista < new Date();
        let status = 'pendente';
        if (isPast) {
          status = d % 4 === 0 ? 'atrasado' : 'concluido';
        }
        const realizada = status === 'concluido' ? new Date(prevista.getTime() + 15 * 60000) : null;

        const exec = await client.query(
          `INSERT INTO atendimento_execucoes
            (atendimento_rotina_id, paciente_id, data_hora_prevista, data_hora_realizada, status)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (atendimento_rotina_id, data_hora_prevista) DO NOTHING
           RETURNING id`,
          [rotinaId, pacienteId, prevista, realizada, status]
        );
        if (!exec.rows[0]) continue;

        await upsertAgenda(client, {
          pacienteId,
          tipo: tipo === 'medicamento' ? 'medicamento' : 'cuidado',
          origemTabela: 'atendimento_execucoes',
          origemId: exec.rows[0].id,
          titulo,
          descricao: `${SEED_TAG} Execução rotina`,
          dataHoraInicio: prevista,
          status: status === 'concluido' ? 'concluido' : status === 'atrasado' ? 'atrasado' : 'pendente',
        });
      }
    }
  }
}

main();
