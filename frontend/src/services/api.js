const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export async function loginRequest({ email, senha }) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, senha }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.message || 'Não foi possível autenticar. Verifique suas credenciais.'
    );
    error.status = response.status;
    error.code = payload?.error;
    throw error;
  }

  return payload;
}

export function persistSession({ token, usuario, menus }) {
  localStorage.setItem('vitalink.token', token);
  localStorage.setItem('vitalink.usuario', JSON.stringify(usuario));
  localStorage.setItem('vitalink.menus', JSON.stringify(menus || []));
}
