/** Eventos de rotina ou medições que, por padrão, não entram na linha do tempo. */
const ROTINA = /^(monitoramento di[aá]rio|observa[cç][aã]o(s)?( rotineira(s)?)?)$/i;
const VITAIS = /^(press[aã]o( arterial)?|glicemia|temperatura|satura[cç][aã]o( de o2)?|peso|frequ[eê]ncia( card[ií]aca)?)$/i;

export function isEventoRotineiroOuMedicao(evento) {
  const titulo = String(evento?.titulo || evento?.title || '').trim();
  const tipo = String(evento?.tipo || evento?.type || evento?.category || '').trim();
  const cabeca = (titulo.split('·')[0] || titulo).trim();
  return [cabeca, titulo, tipo].some((t) => t && (ROTINA.test(t) || VITAIS.test(t)));
}
