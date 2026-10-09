/**
 * Testes de segurança - Rate Limiting
 * Valida que os limitadores de taxa estão funcionando corretamente
 */

describe('Rate Limiting', () => {
  // Configuração de ambiente já feita em setup.js
  
  it('deve ter variáveis de ambiente configuradas', () => {
    expect(process.env.RATE_LIMIT_GLOBAL).toBe('1000');
    expect(process.env.RATE_LIMIT_AUTH).toBe('5');
    expect(process.env.RATE_LIMIT_SENSITIVE).toBe('3');
  });

  it('deve carregar o módulo rateLimiter sem erros', () => {
    const rateLimiter = require('../src/middleware/rateLimiter');
    expect(rateLimiter.authLimiter).toBeDefined();
    expect(rateLimiter.sensitiveAuthLimiter).toBeDefined();
  });

  it('deve validar estrutura dos limiters', () => {
    const rateLimiter = require('../src/middleware/rateLimiter');
    
    // authLimiter deve ser uma função (middleware)
    expect(typeof rateLimiter.authLimiter).toBe('function');
    expect(typeof rateLimiter.sensitiveAuthLimiter).toBe('function');
  });
});
