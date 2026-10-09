/**
 * Testes de segurança - IDOR (Insecure Direct Object Reference)
 * Valida que a verificação de escopo está funcionando corretamente
 */

const request = require('supertest');
const { assertPacienteAccess } = require('../src/services/pacienteScope.service');

describe('IDOR Protection', () => {
  describe('assertPacienteAccess', () => {
    it('deve permitir acesso a paciente no escopo do usuário', async () => {
      const user = {
        id: 1,
        perfilId: 1, // Admin tem acesso irrestrito
      };

      // Não deve lançar erro
      await expect(assertPacienteAccess(user, 1)).resolves.toBe(true);
    });

    it('deve permitir acesso irrestrito para Admin', async () => {
      const user = {
        id: 1,
        perfilId: 1, // Admin
      };

      // Admin pode acessar qualquer paciente
      await expect(assertPacienteAccess(user, 999)).resolves.toBe(true);
    });

    it('deve permitir acesso irrestrito para Médico', async () => {
      const user = {
        id: 2,
        perfilId: 2, // Médico
      };

      // Médico pode acessar qualquer paciente
      await expect(assertPacienteAccess(user, 999)).resolves.toBe(true);
    });

    it('deve permitir acesso irrestrito para Atendente', async () => {
      const user = {
        id: 3,
        perfilId: 3, // Atendente
      };

      // Atendente pode acessar qualquer paciente
      await expect(assertPacienteAccess(user, 999)).resolves.toBe(true);
    });

    it('deve bloquear acesso a paciente fora do escopo', async () => {
      const user = {
        id: 10,
        perfilId: 4, // Cuidador (não admin)
      };

      // Cuidador sem vínculo com paciente deve ser bloqueado
      await expect(assertPacienteAccess(user, 999)).rejects.toThrow();
    });
  });

  describe('Endpoints protegidos', () => {
    it('deve validar estrutura dos controllers críticos', () => {
      const atividadesController = require('../src/controllers/atividades.controller');
      
      // Verificar que os métodos críticos existem
      expect(atividadesController.updateConsulta).toBeDefined();
      expect(atividadesController.deleteConsulta).toBeDefined();
      
      // Verificar que usam assertPacienteAccess (validação de implementação)
      const updateConsultaStr = atividadesController.updateConsulta.toString();
      const deleteConsultaStr = atividadesController.deleteConsulta.toString();
      
      expect(updateConsultaStr).toContain('assertPacienteAccess');
      expect(deleteConsultaStr).toContain('assertPacienteAccess');
    });
  });
});
