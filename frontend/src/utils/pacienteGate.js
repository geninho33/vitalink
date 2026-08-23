export const PACIENTE_GATE_PATHS = ['/onboarding', '/pacientes', '/meus-dados', '/termos'];

export function isPacienteGatePath(pathname) {
  return PACIENTE_GATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function pacienteGateTarget(usuario) {
  const perfilId = Number(usuario?.perfil?.id || usuario?.perfil_id);
  if ([1, 2, 3].includes(perfilId)) return '/pacientes';
  return '/onboarding';
}

export function filterMenusWithoutPatient(menus) {
  const list = Array.isArray(menus) ? menus : [];
  return list.filter((m) => {
    const rota = m.rota || m.path || '';
    return PACIENTE_GATE_PATHS.some((p) => rota === p || rota.startsWith(`${p}/`));
  });
}
