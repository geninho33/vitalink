const KEY = 'vitalink.saved-credentials';

export function loadSavedCredentials() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.email !== 'string') return null;
    return {
      email: parsed.email,
      senha: typeof parsed.senha === 'string' ? parsed.senha : '',
    };
  } catch {
    return null;
  }
}

export function saveCredentials({ email, senha }) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      email: String(email || '').trim(),
      senha: String(senha || ''),
    })
  );
}

export function clearSavedCredentials() {
  localStorage.removeItem(KEY);
}
