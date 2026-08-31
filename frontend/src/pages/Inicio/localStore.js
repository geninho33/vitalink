const PREFIX = 'vitalink-';

export function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateBr(date, time = '') {
  if (!date) return 'Data a definir';
  const value = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  const label = value.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return time ? `${label} · ${time}` : label;
}

export function calculateAge(birthDate) {
  if (!birthDate) return null;
  const iso = String(birthDate).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    ? `${String(birthDate).slice(6, 10)}-${String(birthDate).slice(3, 5)}-${String(birthDate).slice(0, 2)}`
    : String(birthDate).slice(0, 10);
  const [year, month, day] = iso.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
