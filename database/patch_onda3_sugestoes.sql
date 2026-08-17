-- VitaLink Onda 3 — sugestões UX (idempotente)
-- tipo de estabelecimento, menu Termos, menus Responsável/Cuidador/Paciente

-- =============================================================================
-- Estabelecimentos: Hospital / Clínica / Laboratório
-- =============================================================================
DO $$ BEGIN
  ALTER TABLE hospitais_clinicas
    ADD COLUMN tipo_estabelecimento TEXT NOT NULL DEFAULT 'clinica';
EXCEPTION
  WHEN duplicate_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE hospitais_clinicas DROP CONSTRAINT IF EXISTS hospitais_clinicas_tipo_estabelecimento_check;
  ALTER TABLE hospitais_clinicas
    ADD CONSTRAINT hospitais_clinicas_tipo_estabelecimento_check
    CHECK (tipo_estabelecimento IN ('hospital', 'clinica', 'laboratorio'));
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
  WHEN check_violation THEN
    RAISE NOTICE 'tipo_estabelecimento: constraint não aplicada (dados inválidos)';
END $$;

-- =============================================================================
-- Menu Termos e Privacidade
-- =============================================================================
INSERT INTO menus (id, titulo, rota, icone, ordem, menu_pai_id) VALUES
  (40, 'Termos e Privacidade', '/termos', 'scroll-text', 99, NULL)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  rota = EXCLUDED.rota,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  menu_pai_id = EXCLUDED.menu_pai_id,
  ativo = TRUE;

-- =============================================================================
-- Permissões: Responsável (5)
-- Inclui Estabelecimentos, Cuidadores, Consultas, Usuários (escopado), Termos.
-- NÃO inclui Perfis/Acessos globais (permanecem Admin).
-- =============================================================================
DELETE FROM permissoes_acesso WHERE perfil_id = 5;
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 5, m.id, TRUE,
  CASE WHEN m.rota IN (
    '/inicio','/pacientes','/medicos','/remedios','/farmacias','/hospitais',
    '/cuidadores','/empresas-cuidadoras','/agenda','/consultas','/rotina',
    '/timeline','/exames-receitas','/usuarios','/termos'
  ) THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota IN (
    '/inicio','/pacientes','/medicos','/remedios','/farmacias','/hospitais',
    '/cuidadores','/empresas-cuidadoras','/agenda','/consultas','/rotina',
    '/exames-receitas','/usuarios'
  ) THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota IN ('/inicio','/pacientes') THEN TRUE ELSE FALSE END
FROM menus m
WHERE m.id IN (1, 2, 11, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 50, 51, 52, 53, 54);

-- =============================================================================
-- Permissões: Cuidador (4) + Termos
-- editar /remedios permite baixa diária pelo checkbox do Início
-- =============================================================================
DELETE FROM permissoes_acesso WHERE perfil_id = 4;
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 4, m.id, TRUE,
  CASE WHEN m.rota IN ('/inicio', '/termos') THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota IN ('/inicio', '/remedios') THEN TRUE ELSE FALSE END,
  FALSE
FROM menus m
WHERE m.id IN (1, 2, 30, 31, 33, 40, 50, 51, 53, 54);

-- =============================================================================
-- Permissões: Paciente (6) + Termos + Medicamentos + Timeline (busca)
-- =============================================================================
DELETE FROM permissoes_acesso WHERE perfil_id = 6;
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 6, m.id, TRUE,
  CASE WHEN m.rota IN ('/inicio', '/termos') THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota IN ('/inicio', '/remedios') THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota = '/inicio' THEN TRUE ELSE FALSE END
FROM menus m WHERE m.id IN (1, 2, 33, 40, 50, 51, 54);

-- Admin: tudo
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE FROM menus
ON CONFLICT (perfil_id, menu_id) DO UPDATE SET
  pode_ler = TRUE, pode_criar = TRUE, pode_editar = TRUE, pode_deletar = TRUE;
