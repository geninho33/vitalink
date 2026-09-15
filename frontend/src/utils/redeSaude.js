import { apiRequest } from '../services/api';

const SUGGEST_LIMIT = 20;

export function formatLocalLabel(row) {
  if (!row) return '';
  const nome = row.nome_fantasia || row.nome || '';
  const bairro = String(row.bairro || '').trim();
  const cidade = String(row.cidade || '').trim();
  const uf = String(row.uf || '').trim();
  const municipio = [cidade, uf].filter(Boolean).join('/');
  const endereco = [bairro, municipio].filter(Boolean).join(', ');
  return endereco ? `${nome} - ${endereco}` : nome;
}

export function anonymizeCrm(crm) {
  const digits = String(crm || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 3) return '*'.repeat(digits.length);
  return `${'*'.repeat(Math.max(0, digits.length - 3))}${digits.slice(-3)}`;
}

export function formatMedicoLabel(row, { fullCrm = false } = {}) {
  if (!row) return '';
  const nome = row.nome || '';
  if (!row.crm) return nome;
  const crm = fullCrm
    ? row.uf_crm
      ? `${row.crm}/${row.uf_crm}`
      : String(row.crm)
    : row.uf_crm
      ? `${anonymizeCrm(row.crm)}/${row.uf_crm}`
      : anonymizeCrm(row.crm);
  return `${nome} — CRM ${crm}`;
}

export async function searchLocais(q) {
  const res = await apiRequest('/hospitais', {
    query: { q: q || undefined, status: 'ativo', pageSize: SUGGEST_LIMIT },
  });
  return (res.data || []).map((row) => ({
    value: String(row.id),
    label: formatLocalLabel(row),
    raw: row,
  }));
}

export async function searchFarmacias(q) {
  const res = await apiRequest('/farmacias', {
    query: { q: q || undefined, status: 'ativo', pageSize: SUGGEST_LIMIT },
  });
  return (res.data || []).map((row) => ({
    value: String(row.id),
    label: formatLocalLabel(row),
    raw: row,
  }));
}

export async function searchMedicos(q) {
  const res = await apiRequest('/medicos', {
    query: { q: q || undefined, status: 'ativo', pageSize: SUGGEST_LIMIT },
  });
  return (res.data || []).map((row) => ({
    value: String(row.id),
    label: formatMedicoLabel(row),
    raw: row,
  }));
}

export async function searchEspecialidades(q) {
  const res = await apiRequest('/especialidades', {
    query: { q: q || undefined, pageSize: SUGGEST_LIMIT },
  });
  return (res.data || []).map((row) => {
    const nome = row.nome || row;
    return { value: nome, label: nome, raw: row };
  });
}

export async function searchCatalogoMedicamentos(q) {
  const res = await apiRequest('/catalogo-medicamentos', {
    query: { q: q || undefined, pageSize: SUGGEST_LIMIT },
  });
  return (res.data || []).map((row) => ({
    value: `${row.nome_comercial}||${row.principio_ativo || ''}`,
    label: row.principio_ativo
      ? `${row.nome_comercial} (${row.principio_ativo})`
      : row.nome_comercial,
    raw: row,
  }));
}
