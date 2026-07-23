const TOKEN_KEY = 'vitalink.token';
const USER_KEY = 'vitalink.usuario';
const MENUS_KEY = 'vitalink.menus';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUsuario() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function getStoredMenus() {
  try {
    return JSON.parse(localStorage.getItem(MENUS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function persistSession({ token, usuario, menus }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  localStorage.setItem(MENUS_KEY, JSON.stringify(menus || []));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(MENUS_KEY);
}

export function loadSession() {
  const token = getToken();
  const usuario = getStoredUsuario();
  const menus = getStoredMenus();
  if (!token || !usuario) return null;
  return { token, usuario, menus };
}
