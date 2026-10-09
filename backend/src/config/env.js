require('dotenv').config();

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }
}

// Validação de JWT_SECRET forte em produção
const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const jwtSecret = process.env.JWT_SECRET || '';

if (isProduction && jwtSecret.length < 32) {
  throw new Error(
    'JWT_SECRET muito fraco para produção. Use pelo menos 32 caracteres. ' +
    'Gere um segredo forte com: openssl rand -base64 48'
  );
}

if (jwtSecret === 'troque-este-segredo-em-producao-vitalink-2026') {
  const msg = 'JWT_SECRET padrão detectado! NUNCA use valores de exemplo em produção.';
  if (isProduction) {
    throw new Error(msg);
  }
  console.warn(`⚠️  AVISO DE SEGURANÇA: ${msg}`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3333),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  corsOrigin: (() => {
    const corsEnv = process.env.CORS_ORIGIN || '';
    
    // Em produção, se CORS_ORIGIN não estiver configurado ou for '*', recusar
    if (isProduction && (!corsEnv || corsEnv === '*')) {
      throw new Error(
        'CORS_ORIGIN não configurado ou com wildcard (*) em produção. ' +
        'Defina uma lista explícita de origens permitidas (ex.: https://homolog.vitalink.app.br)'
      );
    }
    
    // Em desenvolvimento, fallback para localhost
    const origins = (corsEnv || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    
    // Avisar se wildcard for usado fora de produção
    if (origins.includes('*') && !isProduction) {
      console.warn('⚠️  AVISO: CORS com wildcard (*) permitido apenas em desenvolvimento');
    }
    
    return origins;
  })(),
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'VitaLink <noreply@vitalink.local>',
    appUrl: process.env.APP_PUBLIC_URL || 'http://localhost:5173',
  },
};
