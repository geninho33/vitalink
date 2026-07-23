import { getToken } from './session';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export async function apiRequest(path, { method = 'GET', body, query } = {}) {
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = {
    Accept: 'application/json',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body != null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: payload,
  });

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const err = new Error(data?.message || 'Falha na requisição.');
    err.status = response.status;
    err.code = data?.error;
    throw err;
  }

  return data;
}

export async function loginRequest({ email, senha }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, senha },
  });
}
