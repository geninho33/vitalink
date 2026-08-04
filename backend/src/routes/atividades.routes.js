const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const atividades = require('../controllers/atividades.controller');
const rotina = require('../controllers/rotina.controller');
const anamnese = require('../controllers/anamnese.controller');
const auditoria = require('../controllers/auditoria.controller');

const router = Router();

function mount() {
  const r = Router();
  r.use(authenticate);

  r.get('/agenda', requirePermission('/agenda', 'ler'), atividades.listAgenda);
  r.get(
    '/agenda/:id/documentos',
    requirePermission('/agenda', 'ler'),
    atividades.listAgendaDocumentos
  );
  r.get('/timeline', requirePermission('/timeline', 'ler'), atividades.listTimeline);
  r.get('/timeline/:pacienteId', requirePermission('/timeline', 'ler'), atividades.listTimeline);

  r.get('/consultas', requirePermission('/consultas', 'ler'), atividades.listConsultas);
  r.post('/consultas', requirePermission('/consultas', 'criar'), atividades.createConsulta);
  r.put('/consultas/:id', requirePermission('/consultas', 'editar'), atividades.updateConsulta);
  r.delete('/consultas/:id', requirePermission('/consultas', 'deletar'), atividades.deleteConsulta);

  r.get('/rotina', requirePermission('/rotina', 'ler'), rotina.listRotinas);
  r.post('/rotina', requirePermission('/rotina', 'criar'), rotina.createRotina);
  r.put('/rotina/:id', requirePermission('/rotina', 'editar'), rotina.updateRotina);
  r.delete('/rotina/:id', requirePermission('/rotina', 'deletar'), rotina.deleteRotina);
  r.get('/rotina/execucoes/hoje', requirePermission('/rotina', 'ler'), rotina.listExecucoesHoje);
  r.post('/rotina/execucoes/:id/confirmar', requirePermission('/rotina', 'editar'), rotina.confirmarExecucao);

  r.get('/pacientes/:pacienteId/anamnese', requirePermission('/pacientes', 'ler'), anamnese.getAnamnese);
  r.put('/pacientes/:pacienteId/anamnese', requirePermission('/pacientes', 'editar'), anamnese.upsertAnamnese);

  r.get('/auditoria', requirePermission('/auditoria', 'ler'), auditoria.listAuditoria);

  return r;
}

module.exports = { mountAtividadesRoutes: mount };
