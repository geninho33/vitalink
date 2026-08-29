export const PERFIL = {
  ADMIN: 1,
  MEDICO: 2,
  ATENDENTE: 3,
  CUIDADOR: 4,
  RESPONSAVEL: 5,
  PACIENTE: 6,
  AUTOCUIDADO: 7,
};

export function perfilIdOf(usuario) {
  return Number(
    usuario?.perfil?.id || usuario?.perfil_id || usuario?.papel_ativo?.perfil_id || 0
  );
}

export function isAutocuidado(usuario) {
  return perfilIdOf(usuario) === PERFIL.AUTOCUIDADO;
}
