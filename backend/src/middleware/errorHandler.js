const logger = require('../utils/logger');

function notFound(req, res) {
  res.status(404).json({
    error: 'not_found',
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    code: err.code,
    message: err.message,
  });

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.code || 'internal_error',
    message:
      status === 500
        ? 'Erro interno do servidor.'
        : err.message || 'Falha na requisição.',
  });
}

module.exports = { notFound, errorHandler };
