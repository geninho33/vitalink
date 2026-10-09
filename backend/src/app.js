const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const menusRoutes = require('./routes/menus.routes');
const meController = require('./controllers/me.controller');
const { authenticate } = require('./middleware/auth');
const { requirePermission } = require('./middleware/rbac');
const usuariosRoutes = require('./routes/usuarios.routes');
const perfisRoutes = require('./routes/perfis.routes');
const inicioRoutes = require('./routes/inicio.routes');
const arquivosRoutes = require('./routes/arquivos.routes');
const { mountCrud } = require('./routes/crud.routes');
const { mountAtividadesRoutes } = require('./routes/atividades.routes');
const { hospitais, farmacias } = require('./controllers/estabelecimentos.controller');
const { cuidadores, responsaveis } = require('./controllers/pessoas.controller');
const { medicos, pacientes, listEspecialidades } = require('./controllers/saude.controller');
const examesReceitas = require('./controllers/examesReceitas.controller');
const empresasCuidadoras = require('./controllers/empresasCuidadoras.controller');
const catalogoMedicamentos = require('./controllers/catalogoMedicamentos.controller');
const { mountRemediosRoutes } = require('./routes/remedios.routes');
const { mountPacienteVinculosRoutes } = require('./routes/pacienteVinculos.routes');
const vinculoPaciente = require('./controllers/vinculoPaciente.controller');
const { ensureUploadDir, serveFile } = require('./controllers/arquivos.controller');

function createApp() {
  const app = express();

  // Trust proxy: API está atrás de 2 proxies (nginx host → nginx container frontend → API)
  // Configurável via env para flexibilidade em diferentes ambientes
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS) || 2;
  app.set('trust proxy', trustProxyHops);
  
  // Headers de segurança com CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind usa inline styles
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false, // Necessário para imagens externas
  }));

  // CORS: apenas origens explicitamente permitidas
  const allowAllCors = env.corsOrigin.includes('*');
  app.use(
    cors({
      origin: allowAllCors
        ? true
        : (origin, cb) => {
            // Permitir requisições sem origin (ex.: Postman, curl, mobile apps)
            if (!origin || env.corsOrigin.includes(origin)) {
              return cb(null, true);
            }
            return cb(null, false);
          },
      credentials: true,
    })
  );
  
  app.use(express.json({ limit: '2mb' }));
  
  // Rate limiting global: alto o suficiente para uso normal do SPA
  // mas ainda protege contra abusos (configurável via env)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: Number(process.env.RATE_LIMIT_GLOBAL) || 1000, // Padrão: 1000 req/15min por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'too_many_requests',
      message: 'Muitas requisições deste IP. Tente novamente em alguns minutos.',
    },
    skip: (req) => {
      // Não aplica rate limit no health check
      return req.path === '/health';
    },
  });
  
  app.use(globalLimiter);

  ensureUploadDir();
  
  // Endpoint protegido para servir arquivos (substitui express.static)
  // Requer autenticação e verifica escopo de acesso ao paciente
  app.get('/uploads/:filename', authenticate, serveFile);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'vitalink-api' });
  });

  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/menus', menusRoutes);
  api.get('/me/pacientes', authenticate, meController.listMeusPacientes);
  api.get('/me/paciente', authenticate, meController.getMeuPaciente);
  api.put('/me/paciente', authenticate, meController.updateMeuPaciente);
  api.get('/my-patients', authenticate, meController.listMeusPacientes);
  api.post('/me/pacientes/vincular', authenticate, vinculoPaciente.vincularMeuPaciente);
  api.get('/pacientes/por-cpf/:cpf', authenticate, vinculoPaciente.buscarPorCpf);
  api.post(
    '/pacientes/:pacienteId/vincular-responsavel',
    authenticate,
    vinculoPaciente.vincularResponsavel
  );
  api.use('/usuarios', usuariosRoutes);
  api.use('/perfis', perfisRoutes);
  api.use('/inicio', inicioRoutes);
  api.use('/arquivos', arquivosRoutes);
  api.use('/hospitais', mountCrud(hospitais));
  api.use('/farmacias', mountCrud(farmacias));
  api.use('/cuidadores', mountCrud(cuidadores, { denyCreatePerfilIds: [7], denyDeletePerfilIds: [7] }));
  // Responsável (perfil 5): sem criar/excluir responsáveis
  api.use(
    '/responsaveis',
    mountCrud(responsaveis, { denyCreatePerfilIds: [5, 7], denyDeletePerfilIds: [5, 7] })
  );
  api.use('/medicos', mountCrud(medicos));
  api.get('/especialidades', authenticate, requirePermission('/medicos', 'ler'), listEspecialidades);
  api.use('/empresas-cuidadoras', mountCrud(empresasCuidadoras));
  // Rotas aninhadas antes do CRUD genérico de pacientes
  api.use(
    '/pacientes/:pacienteId/cuidador-vinculos',
    mountPacienteVinculosRoutes()
  );
  // Cuidador (4): consulta pacientes; sem criar/excluir
  api.use(
    '/pacientes',
    mountCrud(pacientes, {
      denyCreatePerfilIds: [4, 7],
      denyDeletePerfilIds: [4, 7],
    })
  );
  api.get(
    '/catalogo-medicamentos',
    authenticate,
    requirePermission('/inicio', 'ler'),
    catalogoMedicamentos.list
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
