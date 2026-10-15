const { createApp } = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { iniciarAgendador } = require('./services/lembretes.service');

const app = createApp();

app.listen(env.port, '0.0.0.0', () => {
  logger.info('VitaLink API iniciada', {
    port: env.port,
    prefix: env.apiPrefix,
    env: env.nodeEnv,
  });
  // Agendador de lembretes de dose (uma instância do backend; reivindicação atômica no banco).
  if (env.nodeEnv !== 'test') iniciarAgendador();
});
