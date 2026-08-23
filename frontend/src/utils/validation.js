import { onlyDigits } from '../hooks/useCep';

export function validateStrongPassword(senha) {
  const s = String(senha || '');
  if (s.length < 8) return 'A senha deve ter ao menos 8 caracteres.';
  if (!/[a-z]/.test(s)) return 'A senha deve conter ao menos uma letra minúscula.';
  if (!/[A-Z]/.test(s)) return 'A senha deve conter ao menos uma letra maiúscula.';
  if (!/[0-9]/.test(s)) return 'A senha deve conter ao menos um número.';
  if (!/[#$*!%]/.test(s)) return 'A senha deve conter um caractere especial (# $ * ! %).';
  return null;
}

export const PASSWORD_HINT =
  'Mínimo 8 caracteres, com maiúscula, minúscula, número e um especial (# $ * ! %).';

export function formatDateBr(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s;
}

export function parseDateBr(value) {
  const s = String(value || '').trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return '';
}

export function maskDateBr(value) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function ageFromIso(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function isAdult(value) {
  const iso = parseDateBr(value);
  const age = ageFromIso(iso);
  return age != null && age >= 18;
}

export function maskMoneyBr(value) {
  const digits = onlyDigits(value);
  if (!digits) return '';
  const cents = Number(digits) / 100;
  return cents.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseMoneyBr(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const digits = onlyDigits(value);
  if (!digits) return null;
  return Number(digits) / 100;
}

export function formatMoneyBr(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
