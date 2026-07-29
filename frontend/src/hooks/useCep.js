export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function maskCep(value) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Máscara CPF: 000.000.000-00 */
export function maskCpf(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Validação simplificada de CPF (dígitos verificadores). */
export function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === Number(cpf[10]);
}

/** Máscara telefone BR: (00) 0000-0000 ou (00) 00000-0000 */
export function maskPhone(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export const TURNO_OPTIONS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
  { value: 'integral', label: 'Integral' },
];

export const PERIODO_HORARIO_OPTIONS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
  { value: 'personalizado', label: 'Personalizado / Hora exata' },
];

/**
 * Busca endereço na ViaCEP (fallback AwesomeAPI).
 */
export async function fetchAddressByCep(cep) {
  const clean = onlyDigits(cep);
  if (clean.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos.');
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          cep: clean,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || '',
          complemento: data.complemento || '',
          source: 'viacep',
        };
      }
    }
  } catch {
    // tenta fallback
  }

  const res2 = await fetch(`https://cep.awesomeapi.com.br/json/${clean}`);
  if (!res2.ok) throw new Error('Não foi possível consultar o CEP.');
  const data2 = await res2.json();
  if (data2.status >= 400 || data2.code === 'not_found') {
    throw new Error('CEP não encontrado.');
  }

  return {
    cep: clean,
    logradouro: data2.address || '',
    bairro: data2.district || '',
    cidade: data2.city || '',
    uf: data2.state || '',
    complemento: '',
    source: 'awesomeapi',
  };
}
