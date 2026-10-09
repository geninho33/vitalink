const rateLimit = require('express-rate-limit');

// Rate limiter estrito para endpoints de autenticação sensíveis
// 5 tentativas por 15 minutos por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'too_many_requests',
    message: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.',
  },
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas (status < 400)
});

// Rate limiter moderado para registro e recuperação de senha
// 3 tentativas por hora por IP
const sensitiveAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
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
