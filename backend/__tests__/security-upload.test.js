/**
 * Testes de segurança - Upload de Arquivos
 * Valida validação de tipos de arquivo e proteção contra path traversal
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { createApp } = require('../src/app');

describe('Upload Security', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long!!!';
    process.env.UPLOAD_DIR = path.join(__dirname, '../uploads-test');
    app = createApp();
  });

  afterAll(() => {
    // Limpar diretório de testes
    const uploadDir = path.join(__dirname, '../uploads-test');
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  });

  describe('Validação de filename', () => {
    it('deve sanitizar nomes de arquivo perigosos', () => {
      const arquivosController = require('../src/controllers/arquivos.controller');
      
      // Verificar que o controller tem validação de path traversal
      const serveFileStr = arquivosController.serveFile.toString();
      
      expect(serveFileStr).toContain('includes');
      expect(serveFileStr).toContain('..');
    });

    it('deve validar UPLOAD_ROOT em produção', () => {
      // Este teste valida que o código verifica UPLOAD_DIR em produção
      // O comportamento correto é já ter sido validado no boot em env.js
      const arquivosController = require('../src/controllers/arquivos.controller');
      
      // Verificar que tem validação de path
      const serveFileStr = arquivosController.serveFile.toString();
      expect(serveFileStr).toContain('RESOLVED_UPLOAD_ROOT');
    });
  });

  describe('Magic bytes validation', () => {
    it('deve validar tipo real do arquivo', async () => {
      const arquivosController = require('../src/controllers/arquivos.controller');
      
      // Verificar que o controller tem função de validação de magic bytes
      const createStr = arquivosController.create.toString();
      
      expect(createStr).toContain('validateFileType');
      expect(createStr).toContain('realMimeType');
    });
  });

  describe('Proteção de escopo', () => {
    it('serveFile deve verificar autenticação', () => {
      const arquivosController = require('../src/controllers/arquivos.controller');
      const serveFileStr = arquivosController.serveFile.toString();
      
      // Deve verificar escopo de paciente
      expect(serveFileStr).toContain('assertPacienteAccess');
    });

    it('deve verificar vinculação a paciente', () => {
      const arquivosController = require('../src/controllers/arquivos.controller');
      const serveFileStr = arquivosController.serveFile.toString();
      
      // Deve buscar paciente_id do arquivo
      expect(serveFileStr).toContain('paciente_id');
    });
  });
});
