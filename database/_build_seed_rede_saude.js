/**
 * Gera database/seed_rede_saude.sql a partir da API pública CNES
 * (apidadosabertos.saude.gov.br) e da ficha de profissionais do CNES2.
 *
 * Uso: node database/_build_seed_rede_saude.js
 */
const fs = require('fs');
const path = require('path');

const API = 'https://apidadosabertos.saude.gov.br/cnes/estabelecimentos';
const OBS = 'Catálogo público VitaLink — Grande Florianópolis.';
const OUT = path.join(__dirname, 'seed_rede_saude.sql');

const MUNICIPIOS = {
  420540: 'Florianópolis',
  421660: 'São José',
  421190: 'Palhoça',
  420230: 'Biguaçu',
  421720: 'Santo Amaro da Imperatriz',
  420120: 'Antônio Carlos',
  420600: 'Governador Celso Ramos',
  420060: 'Águas Mornas',
  421725: 'São Pedro de Alcântara',
};

const HOSPITAL_TIPOS = new Set([5, 7, 20, 21, 62]);
const CLINICA_TIPOS = new Set([4, 15, 22, 36, 61, 69, 70, 73]);
const LAB_TIPOS = new Set([39, 67, 80]);
const FARMACIA_TIPOS = new Set([43]);
const KEEP_TIPOS = new Set([...HOSPITAL_TIPOS, ...CLINICA_TIPOS, ...LAB_TIPOS, ...FARMACIA_TIPOS]);

const CBO_ESPECIALIDADE = {
  225105: 'Clínica Médica',
  225110: 'Cirurgia Geral',
  225120: 'Cardiologia',
  225125: 'Clínica Médica',
  225130: 'Dermatologia',
  225135: 'Ginecologia e Obstetrícia',
  225140: 'Medicina de Família e Comunidade',
  225142: 'Mastologia',
  225145: 'Medicina Intensiva',
  225150: 'Medicina de Emergência',
  225151: 'Anestesiologia',
  225155: 'Homeopatia',
  225160: 'Infectologia',
  225165: 'Nefrologia',
  225170: 'Neurologia',
  225175: 'Nutrologia',
  225180: 'Oftalmologia',
  225185: 'Oncologia Clínica',
  225195: 'Ortopedia e Traumatologia',
  225203: 'Otorrinolaringologia',
  225210: 'Patologia',
  225215: 'Pediatria',
  225220: 'Pneumologia',
  225225: 'Psiquiatria',
  225230: 'Radioterapia',
  225235: 'Reumatologia',
  225240: 'Urologia',
  225250: 'Ginecologia e Obstetrícia',
  225255: 'Cirurgia Pediátrica',
  225260: 'Cirurgia Plástica',
  225265: 'Cirurgia Torácica',
  225270: 'Cirurgia Vascular',
  225275: 'Cirurgia Cardiovascular',
  225280: 'Cirurgia de Cabeça e Pescoço',
  225285: 'Cirurgia do Aparelho Digestivo',
  225290: 'Neurocirurgia',
  225295: 'Cirurgia Oncológica',
  225305: 'Medicina Nuclear',
  225310: 'Medicina Preventiva',
  225315: 'Genética Médica',
  225320: 'Radiologia e Diagnóstico por Imagem',
  225325: 'Endocrinologia',
  225330: 'Hematologia e Hemoterapia',
  225335: 'Angiologia',
  225340: 'Cancerologia Pediátrica',
  225345: 'Cirurgia da Mão',
  225350: 'Medicina do Trabalho',
  225355: 'Radiologia Intervencionista',
  225360: 'Medicina Esportiva',
  225365: 'Geriatria',
  225370: 'Acupuntura',
  225375: 'Alergia e Imunologia',
  225180: 'Oftalmologia',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, retries = 4) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'VitalinkSeed/1.0 (catalogo publico CNES)' },
        signal: AbortSignal.timeout(40000),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(800 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(600 * (i + 1));
    }
  }
  return { estabelecimentos: [] };
}

async function fetchText(url, retries = 3) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'VitalinkSeed/1.0 (catalogo publico CNES)' },
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.text();
    } catch (err) {
      if (i === retries - 1) return '';
      await sleep(700 * (i + 1));
    }
  }
  return '';
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function sqlStr(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function titleCase(value) {
  const small = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o']);
  const raw = String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  return raw
    .split(' ')
    .map((w, i) => {
      if (i > 0 && small.has(w)) return w;
      if (w.length <= 2 && /^(sc|s\/a|sa|ltda)$/i.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function cep8(value) {
  const d = onlyDigits(value).slice(0, 8);
  return d.length === 8 ? d : null;
}

function phoneDigits(value) {
  let d = onlyDigits(value);
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 10 || d.length === 11) return d;
  if (d.length === 8) return `48${d}`;
  if (d.length === 9) return `48${d}`;
  return null;
}

function tipoEstab(codigo) {
  if (HOSPITAL_TIPOS.has(codigo)) return 'hospital';
  if (LAB_TIPOS.has(codigo)) return 'laboratorio';
  return 'clinica';
}

function mapEspecialidade(cbo, desc) {
  const code = Number(String(cbo || '').slice(0, 6));
  if (CBO_ESPECIALIDADE[code]) return CBO_ESPECIALIDADE[code];
  const d = String(desc || '')
    .replace(/^MEDICO\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!d) return 'Clínica Médica';
  return titleCase(d);
}

function crmFromCns(cns) {
  const d = onlyDigits(cns);
  if (d.length < 10) return null;
  return d.slice(-10);
}

async function listMunicipio(ibge) {
  const all = [];
  for (let offset = 0; offset < 20000; offset += 20) {
    const url = `${API}?codigo_municipio=${ibge}&limit=20&offset=${offset}`;
    const data = await fetchJson(url);
    const rows = data.estabelecimentos || [];
    if (!rows.length) break;
    all.push(...rows);
    if (rows.length < 20) break;
    if (offset % 200 === 0) process.stderr.write(`  ${MUNICIPIOS[ibge]} offset ${offset} (${all.length})\n`);
    await sleep(40);
  }
  return all;
}

function normalizeEstab(row) {
  if (!KEEP_TIPOS.has(Number(row.codigo_tipo_unidade))) return null;
  if (row.codigo_motivo_desabilitacao_estabelecimento) return null;
  const cnpj = onlyDigits(row.numero_cnpj || row.numero_cnpj_entidade);
  if (cnpj.length !== 14 && cnpj.length !== 11) return null;
  const cep = cep8(row.codigo_cep_estabelecimento);
  if (!cep || !/^(880|881)/.test(cep)) return null;
  const phone = phoneDigits(row.numero_telefone_estabelecimento);
  if (!phone) return null;
  const cidade = MUNICIPIOS[Number(row.codigo_municipio)];
  if (!cidade) return null;
  const numero = String(row.numero_estabelecimento || '').trim() || 'S/N';
  const logradouro = titleCase(row.endereco_estabelecimento);
  const bairro = titleCase(row.bairro_estabelecimento);
  if (!logradouro || !bairro) return null;
  const razao = String(row.nome_razao_social || '').trim() || String(row.nome_fantasia || '').trim();
  const fantasiaBase = String(row.nome_fantasia || razao).trim();
  if (!fantasiaBase) return null;
  let fantasia = titleCase(fantasiaBase);
  if (bairro && !fantasia.toLowerCase().includes(bairro.toLowerCase().slice(0, 6))) {
    fantasia = `${fantasia} — ${bairro}`;
  }
  return {
    cnes: String(row.codigo_cnes),
    ibge: String(row.codigo_municipio),
    tipoUnidade: Number(row.codigo_tipo_unidade),
    tipo: tipoEstab(Number(row.codigo_tipo_unidade)),
    razao: razao.slice(0, 180),
    fantasia: fantasia.slice(0, 180),
    tipoDoc: cnpj.length === 11 ? 'cpf' : 'cnpj',
    documento: cnpj,
    telefone: phone,
    cep,
    logradouro: logradouro.slice(0, 180),
    numero: numero.slice(0, 20),
    bairro: bairro.slice(0, 120),
    cidade,
    uf: 'SC',
  };
}

async function fetchMedicos(estab) {
  const unidade = `${estab.ibge}${String(estab.cnes).padStart(7, '0')}`;
  const html = await fetchText(`http://cnes2.datasus.gov.br/Mod_Profissional.asp?VCo_Unidade=${unidade}`);
  if (!html) return [];
  const medicos = [];
  const re =
    /Exibe_Ficha_Prof_Sus\.asp[^>]*>([^<]+)<[\s\S]{0,1200}?(\d{15})[\s\S]{0,800}?(\d{6})\s*-\s*([^<]{5,90})/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html))) {
    const nome = titleCase(m[1].replace(/<[^>]+>/g, '')).slice(0, 150);
    const cns = m[2];
    const cbo = m[3];
    if (!cbo.startsWith('225')) continue;
    if (seen.has(cns)) continue;
    seen.add(cns);
    const crm = crmFromCns(cns);
    if (!crm || !nome) continue;
    medicos.push({
      nome,
      crm,
      especialidade: mapEspecialidade(cbo, m[4]).slice(0, 120),
      telefone: estab.telefone,
      email: `${crm}@catalogo.vitalink.local`,
      doc: estab.documento,
    });
  }
  return medicos;
}

function valuesLineH(e) {
  return `  (${sqlStr(e.razao)}, ${sqlStr(e.fantasia)}, ${sqlStr(e.tipo)}, ${sqlStr(e.tipoDoc)}, ${sqlStr(e.documento)},
   ${sqlStr(e.telefone)}, ${sqlStr(e.cep)}, ${sqlStr(e.logradouro)}, ${sqlStr(e.numero)}, ${sqlStr(e.bairro)}, ${sqlStr(e.cidade)}, 'SC', 'ativo',
   ${sqlStr(OBS)})`;
}

function valuesLineF(e) {
  return `  (${sqlStr(e.razao)}, ${sqlStr(e.fantasia)}, ${sqlStr(e.tipoDoc)}, ${sqlStr(e.documento)},
   ${sqlStr(e.telefone)}, ${sqlStr(e.cep)}, ${sqlStr(e.logradouro)}, ${sqlStr(e.numero)}, ${sqlStr(e.bairro)}, ${sqlStr(e.cidade)}, 'SC', 'ativo',
   ${sqlStr(OBS)})`;
}

async function mapPool(items, limit, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  process.stderr.write('Baixando estabelecimentos CNES...\n');
  const raw = [];
  for (const ibge of Object.keys(MUNICIPIOS)) {
    process.stderr.write(`Município ${MUNICIPIOS[ibge]} (${ibge})\n`);
    raw.push(...(await listMunicipio(ibge)));
  }
  process.stderr.write(`Total bruto: ${raw.length}\n`);

  const hospClin = [];
  const farm = [];
  const seenDocH = new Set();
  const seenDocF = new Set();
  for (const row of raw) {
    const n = normalizeEstab(row);
    if (!n) continue;
    if (FARMACIA_TIPOS.has(n.tipoUnidade)) {
      if (seenDocF.has(n.documento)) continue;
      seenDocF.add(n.documento);
      farm.push(n);
    } else {
      if (seenDocH.has(n.documento)) continue;
      seenDocH.add(n.documento);
      hospClin.push(n);
    }
  }

  hospClin.sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt') || a.fantasia.localeCompare(b.fantasia, 'pt'));
  farm.sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt') || a.fantasia.localeCompare(b.fantasia, 'pt'));

  process.stderr.write(`Hospitais/clínicas/labs: ${hospClin.length} | Farmácias: ${farm.length}\n`);

  const scrapeTargets = hospClin.filter((e) =>
    HOSPITAL_TIPOS.has(e.tipoUnidade) || CLINICA_TIPOS.has(e.tipoUnidade) || LAB_TIPOS.has(e.tipoUnidade)
  );
  const allowedDocs = new Set(hospClin.map((e) => e.documento));
  let medicos = [];
  const seenCrm = new Set();
  const cacheFile = path.join(__dirname, '_medicos_cache.json');
  const scrapedDocs = new Set();

  if (fs.existsSync(cacheFile) && process.env.REFRESH_MEDICOS !== '1') {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const list = Array.isArray(cached) ? cached : cached.medicos || [];
    for (const d of cached.scrapedDocs || []) scrapedDocs.add(d);
    for (const m of list) {
      scrapedDocs.add(m.doc);
      if (!allowedDocs.has(m.doc)) continue;
      const key = `${m.crm}|SC`;
      if (seenCrm.has(key)) continue;
      seenCrm.add(key);
      medicos.push(m);
    }
    process.stderr.write(`Médicos reaproveitados do cache: ${medicos.length}\n`);
  }

  const missing = scrapeTargets.filter((e) => !scrapedDocs.has(e.documento));
  const skipScrape = process.env.SKIP_MEDICOS === '1';
  if (!skipScrape && missing.length) {
    process.stderr.write(`Buscando médicos CNES em ${missing.length} unidades novas...\n`);
    await mapPool(missing, 4, async (estab, idx) => {
      if (idx % 25 === 0) process.stderr.write(`  médicos ${idx}/${missing.length} (únicos ${seenCrm.size})\n`);
      const list = await fetchMedicos(estab);
      scrapedDocs.add(estab.documento);
      for (const m of list) {
        const key = `${m.crm}|SC`;
        if (seenCrm.has(key)) continue;
        seenCrm.add(key);
        medicos.push(m);
      }
      await sleep(80);
    });
  }
  medicos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  fs.writeFileSync(
    cacheFile,
    JSON.stringify({ scrapedDocs: [...scrapedDocs], medicos })
  );
  process.stderr.write(`Médicos únicos: ${medicos.length}\n`);

  const chunks = (arr, n) => {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  const parts = [];
  parts.push(`-- =============================================================================
-- VitaLink — Catálogo público da rede de saúde (Grande Florianópolis)
-- =============================================================================
-- Fonte: CNES / API Dados Abertos do SUS (apidadosabertos.saude.gov.br),
-- atualizado em ${new Date().toISOString().slice(0, 10)}.
-- Municípios: Florianópolis, São José, Palhoça, Biguaçu, Santo Amaro da
-- Imperatriz, Antônio Carlos, Governador Celso Ramos, Águas Mornas e
-- São Pedro de Alcântara.
--
-- Estabelecimentos: CNPJ/CPF, endereço e telefone públicos do CNES.
-- Médicos: nomes e especialidade (CBO) publicados no CNES; o CRM de catálogo
-- é derivado do CNS (o CNES não divulga o número de CRM). Não substitui o
-- cadastro do CRM-SC.
--
-- NÃO atualiza nem apaga registros existentes (produção/homologação).
-- usuario_id permanece NULL = catálogo compartilhado.
-- Observações NÃO usam [VITALINK_SEED].
-- Totais gerados: hospitais/clínicas/labs=${hospClin.length}, farmacias=${farm.length}, medicos=${medicos.length}
-- =============================================================================
`);

  for (const group of chunks(hospClin, 80)) {
    parts.push(`INSERT INTO hospitais_clinicas (
  razao_social, nome_fantasia, tipo_estabelecimento, tipo_documento, documento,
  telefone_principal, cep, logradouro, numero, bairro, cidade, uf, status, observacoes
) VALUES
${group.map(valuesLineH).join(',\n')}
ON CONFLICT (documento) WHERE documento IS NOT NULL AND documento <> '' DO NOTHING;
`);
  }

  for (const group of chunks(farm, 80)) {
    parts.push(`INSERT INTO farmacias (
  razao_social, nome_fantasia, tipo_documento, documento,
  telefone_principal, cep, logradouro, numero, bairro, cidade, uf, status, observacoes
) VALUES
${group.map(valuesLineF).join(',\n')}
ON CONFLICT (documento) WHERE documento IS NOT NULL AND documento <> '' DO NOTHING;
`);
  }

  for (const group of chunks(medicos, 80)) {
    const values = group
      .map(
        (m) =>
          `      (${sqlStr(m.nome)}, ${sqlStr(m.crm)}, 'SC', ${sqlStr(m.especialidade)}, ${sqlStr(m.telefone)}, ${sqlStr(m.email)}, ${sqlStr(m.doc)})`
      )
      .join(',\n');
    parts.push(`INSERT INTO medicos (
  nome, crm, uf_crm, especialidade, telefone_principal, email, hospital_clinica_id, status, observacoes
)
SELECT s.nome, s.crm, s.uf_crm, s.especialidade, s.telefone, s.email, s.hospital_id, 'ativo',
       ${sqlStr(OBS)}
FROM (
  SELECT v.nome, v.crm, v.uf_crm, v.especialidade, v.telefone, v.email, h.id AS hospital_id
  FROM (
    VALUES
${values}
  ) AS v(nome, crm, uf_crm, especialidade, telefone, email, doc)
  LEFT JOIN hospitais_clinicas h ON h.documento = v.doc
) s
WHERE s.hospital_id IS NOT NULL
ON CONFLICT (crm, uf_crm) DO NOTHING;
`);
  }

  parts.push(`INSERT INTO medico_estabelecimentos (medico_id, hospital_clinica_id)
SELECT m.id, m.hospital_clinica_id
FROM medicos m
WHERE m.hospital_clinica_id IS NOT NULL
  AND m.observacoes = ${sqlStr(OBS)}
ON CONFLICT DO NOTHING;
`);

  fs.writeFileSync(OUT, parts.join('\n'), 'utf8');
  process.stderr.write(`Escrito ${OUT}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
