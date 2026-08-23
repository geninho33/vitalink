const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SPECIAL = /[#$*!%]/;

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
    return 'A senha deve conter um caractere especial (# $ * ! %).';
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

module.exports = {
  onlyDigits,
  isValidEmail,
  isValidCpf,
  validateStrongPassword,
  parseIsoDate,
  ageFromIso,
  assertAdult,
  assertEmail,
  assertCpf,
  assertPassword,
  validationError,
};
