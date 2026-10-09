const rateLimit = require('express-rate-limit');

// Rate limiter estrito para endpoints de autenticação sensíveis
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: Number(process.env.RATE_LIMIT_AUTH) || 5, // Padrão: 5 tentativas
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'too_many_requests',
    message: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.',
  },
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas (status < 400)
});

// Rate limiter moderado para registro e recuperação de senha
const sensitiveAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: Number(process.env.RATE_LIMIT_SENSITIVE) || 3, // Padrão: 3 tentativas
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'too_many_requests',
    message: 'Muitas tentativas. Tente novamente em 1 hora.',
  },
});

module.exports = {
  authLimiter,
  sensitiveAuthLimiter,
};
