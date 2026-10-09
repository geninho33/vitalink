/**
 * Testes de segurança - Rate Limiting
 * Valida que os limitadores de taxa estão funcionando corretamente
 */

const request = require('supertest');
const { createApp } = require('../src/app');

describe('Rate Limiting', () => {
  let app;

  beforeAll(() => {
    // Configurar variáveis de ambiente para testes
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long!!!';
    app = createApp();
  });

  describe('Rate limit global', () => {
    it('deve permitir requisições dentro do limite', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    it('deve incluir headers de rate limit', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'test@test.com',
        senha: 'test123',
      });
      
      // Verificar que os headers de rate limit estão presentes
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Rate limit de autenticação', () => {
    it('deve permitir até 5 tentativas de login em 15 minutos', async () => {
      // Fazer 5 tentativas (limite)
      for (let i = 0; i < 5; i++) {
        const res = await request(app).post('/api/v1/auth/login').send({
          email: `test${i}@test.com`,
          senha: 'wrongpassword',
        });
        expect(res.status).not.toBe(429); // Não deve bloquear ainda
      }
    });

    // Nota: teste completo de bloqueio requer esperar 15 minutos ou mockar o tempo
    // Para CI/CD, considere usar sinon ou jest.useFakeTimers()
  });

  describe('Endpoints sensíveis', () => {
    it('registro deve ter rate limit separado', async () => {
      const res = await request(app).post('/api/v1/auth/registro').send({
        nome: 'Test User',
        email: 'newuser@test.com',
        senha: 'Test@123456',
      });
      
      // Deve ter rate limit aplicado (headers presentes)
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });

    it('esqueci-senha deve ter rate limit rigoroso', async () => {
      const res = await request(app).post('/api/v1/auth/esqueci-senha').send({
        email: 'test@test.com',
      });
      
      // Deve ter rate limit aplicado
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });
  });
});
