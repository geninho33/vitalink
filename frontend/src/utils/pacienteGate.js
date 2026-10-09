export const PACIENTE_GATE_PATHS = ['/onboarding', '/pacientes', '/meus-dados', '/termos'];
/** Autocuidado/Paciente sem ficha ainda: mantém Início e Dashboard no menu. */
export const SELF_CARE_GATE_PATHS = ['/inicio', '/dashboard', '/meus-dados', '/termos', '/onboarding'];

export function isPacienteGatePath(pathname) {
  return PACIENTE_GATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isSelfCareGatePath(pathname) {
  return SELF_CARE_GATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function pacienteGateTarget(usuario) {
  const perfilId = Number(usuario?.perfil?.id || usuario?.perfil_id);
  if ([1, 2, 3].includes(perfilId)) return '/pacientes';
  if (usuario?.onboarding_concluido !== false) {
    return perfilId === 6 || perfilId === 7 ? '/inicio' : '/dashboard';
  }
  return '/onboarding';
}

export function filterMenusWithoutPatient(menus, { selfCare = false } = {}) {
  const list = Array.isArray(menus) ? menus : [];
  const allowed = selfCare ? SELF_CARE_GATE_PATHS : PACIENTE_GATE_PATHS;
  return list.filter((m) => {
    const rota = m.rota || m.path || '';
    return allowed.some((p) => rota === p || rota.startsWith(`${p}/`));
  });
}
