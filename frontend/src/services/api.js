import { getToken, clearSession, persistSession, loadSession } from './session';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/** Callbacks registrados pelo AuthProvider para reagir a 401. */
const unauthorizedHandlers = new Set();

export function onUnauthorized(handler) {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

function emitUnauthorized(message) {
  unauthorizedHandlers.forEach((fn) => {
    try {
      fn(message);
    } catch {
      /* ignore */
    }
  });
}

/**
 * Monta URL absoluta mesmo quando VITE_API_URL é relativo (ex.: /api/v1 no Nginx).
 */
function buildUrl(path, query) {
  const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const joined = `${base}${suffix}`;

  let url;
  if (/^https?:\/\//i.test(joined)) {
    url = new URL(joined);
  } else {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';
    url = new URL(joined.startsWith('/') ? joined : `/${joined}`, origin);
  }

  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') url.searchParams.set(k, v);
    });
  }

  return url.toString();
}

export async function apiRequest(path, { method = 'GET', body, query, skipAuthRedirect = false } = {}) {
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

  const response = await fetch(buildUrl(path, query), {
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
    const message = data?.message || 'Falha na requisição.';

    // Interceptor global de 401 — limpa sessão e redireciona via AuthContext
    if (response.status === 401 && !skipAuthRedirect && !String(path).includes('/auth/login')) {
      clearSession();
      emitUnauthorized(
        message ||
          'Sua sessão expirou ou suas permissões foram alteradas. Por favor, faça login novamente.'
      );
    }

    const err = new Error(message);
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
    skipAuthRedirect: true,
  });
}

/** Atualiza menus/usuário no storage mantendo o token atual. */
export async function refreshSessionRequest() {
  const data = await apiRequest('/menus/me');
  const current = loadSession();
  if (!current?.token) return data;
  persistSession({
    token: current.token,
    usuario: data.usuario || current.usuario,
    menus: data.menus || [],
  });
  return data;
}
