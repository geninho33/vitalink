const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const menusRoutes = require('./routes/menus.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const perfisRoutes = require('./routes/perfis.routes');
const medicosRoutes = require('./routes/medicos.routes');
const remediosRoutes = require('./routes/remedios.routes');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'vitalink-api' });
  });

  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/menus', menusRoutes);
  api.use('/usuarios', usuariosRoutes);
  api.use('/perfis', perfisRoutes);
  api.use('/medicos', medicosRoutes);
  api.use('/remedios', remediosRoutes);

  app.use(env.apiPrefix, api);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
