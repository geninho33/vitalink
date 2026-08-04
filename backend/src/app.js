const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const menusRoutes = require('./routes/menus.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const perfisRoutes = require('./routes/perfis.routes');
const inicioRoutes = require('./routes/inicio.routes');
const arquivosRoutes = require('./routes/arquivos.routes');
const { mountCrud } = require('./routes/crud.routes');
const { mountAtividadesRoutes } = require('./routes/atividades.routes');
const { hospitais, farmacias } = require('./controllers/estabelecimentos.controller');
const { cuidadores, responsaveis } = require('./controllers/pessoas.controller');
const { medicos, pacientes } = require('./controllers/saude.controller');
const examesReceitas = require('./controllers/examesReceitas.controller');
const { mountRemediosRoutes } = require('./routes/remedios.routes');
const { ensureUploadDir, UPLOAD_ROOT } = require('./controllers/arquivos.controller');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({
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

  ensureUploadDir();
  app.use('/uploads', express.static(UPLOAD_ROOT));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'vitalink-api' });
  });

  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/menus', menusRoutes);
  api.use('/usuarios', usuariosRoutes);
  api.use('/perfis', perfisRoutes);
  api.use('/inicio', inicioRoutes);
  api.use('/arquivos', arquivosRoutes);
  api.use('/hospitais', mountCrud(hospitais));
  api.use('/farmacias', mountCrud(farmacias));
  api.use('/cuidadores', mountCrud(cuidadores));
  // Responsável (perfil 5): sem criar/excluir responsáveis
  api.use(
    '/responsaveis',
    mountCrud(responsaveis, { denyCreatePerfilIds: [5], denyDeletePerfilIds: [5] })
  );
  api.use('/medicos', mountCrud(medicos));
  // Cuidador (4): consulta pacientes; sem criar/excluir
  api.use(
    '/pacientes',
    mountCrud(pacientes, {
      denyCreatePerfilIds: [4],
      denyDeletePerfilIds: [4],
    })
  );
  api.use('/remedios', mountRemediosRoutes());
  api.use('/exames-receitas', mountCrud(examesReceitas));
  api.use(mountAtividadesRoutes());

  app.use(env.apiPrefix, api);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
