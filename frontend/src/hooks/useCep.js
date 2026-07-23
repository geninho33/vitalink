export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function maskCep(value) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

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
