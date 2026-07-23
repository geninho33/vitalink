const { createApp } = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

const app = createApp();

app.listen(env.port, () => {
  logger.info('VitaLink API iniciada', {
    port: env.port,
    prefix: env.apiPrefix,
    env: env.nodeEnv,
  });
});
