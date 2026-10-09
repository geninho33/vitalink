// Configuração simplificada de testes que não requer DB conectado
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';
process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long!!!';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.TRUST_PROXY_HOPS = '2';
process.env.RATE_LIMIT_GLOBAL = '1000';
process.env.RATE_LIMIT_AUTH = '5';
process.env.RATE_LIMIT_SENSITIVE = '3';
