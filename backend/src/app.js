const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const menusRoutes = require('./routes/menus.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const perfisRoutes = require('./routes/perfis.routes');
const { mountCrud } = require('./routes/crud.routes');
const { mountAtividadesRoutes } = require('./routes/atividades.routes');
const { hospitais, farmacias } = require('./controllers/estabelecimentos.controller');
const { cuidadores, responsaveis } = require('./controllers/pessoas.controller');
const { medicos, pacientes, remedios } = require('./controllers/saude.controller');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({
    // Permite o frontend (outra origem/IP) embutir/consumir a API
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  const allowAllCors = env.corsOrigin.includes('*');
  app.use(
    cors({
      origin: allowAllCors
        ? true
        : (origin, cb) => {
            if (!origin || env.corsOrigin.includes(origin)) {
              return cb(null, true);
            }
            return cb(null, false);
          },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'vitalink-api' });
  });

  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/menus', menusRoutes);
  api.use('/usuarios', usuariosRoutes);
  api.use('/perfis', perfisRoutes);
  api.use('/hospitais', mountCrud(hospitais));
  api.use('/farmacias', mountCrud(farmacias));
  api.use('/cuidadores', mountCrud(cuidadores));
  api.use('/responsaveis', mountCrud(responsaveis));
  api.use('/medicos', mountCrud(medicos));
  api.use('/pacientes', mountCrud(pacientes));
  api.use('/remedios', mountCrud(remedios));
  api.use(mountAtividadesRoutes());

  app.use(env.apiPrefix, api);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
