const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SPECIAL = /[#$*!%@&+_-]/;
const PASSWORD_SPECIAL_HINT = '# $ * ! % @ & + - _';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

function isValidCpf(value) {
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

function validateStrongPassword(senha) {
  const s = String(senha || '');
  if (s.length < 8) {
    return 'A senha deve ter ao menos 8 caracteres.';
  }
  if (!/[a-z]/.test(s)) {
    return 'A senha deve conter ao menos uma letra minúscula.';
  }
  if (!/[A-Z]/.test(s)) {
    return 'A senha deve conter ao menos uma letra maiúscula.';
  }
  if (!/[0-9]/.test(s)) {
    return 'A senha deve conter ao menos um número.';
  }
  if (!PASSWORD_SPECIAL.test(s)) {
    return `A senha deve conter um caractere especial (${PASSWORD_SPECIAL_HINT}).`;
  }
  return null;
}

function parseIsoDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function ageFromIso(iso) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function assertAdult(dataNascimento) {
  const iso = parseIsoDate(dataNascimento);
  if (!iso) {
    const err = new Error('Informe a data de nascimento no formato DD/MM/AAAA.');
    err.status = 400;
    err.code = 'validation_error';
    throw err;
  }
  const age = ageFromIso(iso);
  if (age == null || age < 18) {
    const err = new Error(
      'Cadastro restrito a maiores de 18 anos. Menores de idade não podem criar conta.'
    );
    err.status = 403;
    err.code = 'underage';
    throw err;
  }
  return iso;
}

function validationError(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = 'validation_error';
  throw err;
}

function assertEmail(email) {
  if (!isValidEmail(email)) validationError('E-mail inválido.');
  return String(email).trim().toLowerCase();
}

function assertCpf(cpf) {
  if (!isValidCpf(cpf)) validationError('CPF inválido.');
  return onlyDigits(cpf);
}

function assertPassword(senha) {
  const msg = validateStrongPassword(senha);
  if (msg) validationError(msg);
  return senha;
}

function assertTelefone(telefone) {
  const digits = onlyDigits(telefone);
  if (digits.length < 10 || digits.length > 11) {
    validationError('Informe um telefone válido com DDD.');
  }
  return digits;
}

const UF_SET = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

function isValidUf(value) {
  return UF_SET.has(String(value || '').trim().toUpperCase());
}

function isValidCrm(value) {
  const digits = onlyDigits(value);
  return digits.length >= 4 && digits.length <= 10;
}

function isValidCnpj(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (nums, weights) => {
    const sum = nums.reduce((s, n, i) => s + n * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const n = cnpj.split('').map(Number);
  const d1 = calc(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== n[12]) return false;
  const d2 = calc(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === n[13];
}

function assertCrm(crm, ufCrm) {
  if (!isValidCrm(crm)) {
    validationError('Informe um CRM válido (4 a 10 dígitos).');
  }
  if (!isValidUf(ufCrm)) {
    validationError('Informe a UF do CRM.');
  }
  return { crm: onlyDigits(crm), uf_crm: String(ufCrm).trim().toUpperCase() };
}

function assertCnpj(cnpj) {
  if (!isValidCnpj(cnpj)) validationError('CNPJ inválido.');
  return onlyDigits(cnpj);
}

module.exports = {
  onlyDigits,
  isValidEmail,
  isValidCpf,
  isValidCnpj,
  isValidCrm,
  isValidUf,
  validateStrongPassword,
  parseIsoDate,
  ageFromIso,
  assertAdult,
  assertEmail,
  assertCpf,
  assertCnpj,
  assertCrm,
  assertPassword,
  assertTelefone,
  validationError,
};
