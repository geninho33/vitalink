-- =============================================================================
-- Patch: estrutura de menus Administração (submenu RBAC)
-- Execute após schema.sql se o banco já existir.
-- =============================================================================
USE vitalink;

-- Limpa permissões e menus para recriar hierarquia
DELETE FROM permissoes_acesso;
DELETE FROM menus;

INSERT INTO menus (id, titulo, rota, icone, ordem, menu_pai_id) VALUES
  (1, 'Dashboard', '/dashboard', 'layout-dashboard', 10, NULL),
  (10, 'Administração', NULL, 'building', 20, NULL),
  (11, 'Usuários', '/usuarios', 'users', 21, 10),
  (12, 'Perfis', '/perfis', 'masks', 22, 10),
  (13, 'Acessos', '/acessos', 'key', 23, 10),
  (14, 'Auditoria', '/auditoria', 'scroll-text', 24, 10),
  (20, 'Médicos', '/medicos', 'stethoscope', 40, NULL),
  (21, 'Remédios', '/remedios', 'pill', 50, NULL);

INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 1, id, 1, 1, 1, 1 FROM menus;

INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar) VALUES
  (2, 1, 1, 0, 0, 0),
  (2, 20, 1, 1, 1, 0),
  (2, 21, 1, 1, 1, 0);

INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar) VALUES
  (3, 1, 1, 0, 0, 0),
  (3, 20, 1, 0, 0, 0),
  (3, 21, 1, 0, 0, 0);
