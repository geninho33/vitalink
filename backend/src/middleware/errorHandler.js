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

  // Multer / upload
  if (err && (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE')) {
    return res.status(400).json({
      error: 'validation_error',
      message: err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo excede 8 MB.' : err.message,
    });
  }

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
