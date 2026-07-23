/**
 * Logger com sanitização LGPD.
 * Nunca registra e-mail completo, senhas, tokens ou campos clínicos.
 */

const SENSITIVE_KEYS = [
  'password',
  'senha',
  'senha_hash',
  'token',
  'authorization',
  'email',
  'cpf',
  'crm',
  'telefone',
  'instrucoes_uso',
  'principio_ativo',
  'diagnostico',
  'prontuario',
];

function sanitize(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value !== 'object') return value;

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = sanitize(val);
    }
  }
  return out;
}

function log(level, message, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: sanitize(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  sanitize,
};
