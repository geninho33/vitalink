-- VitaLink — menu Empresas Cuidadoras + permissões (idempotente)

INSERT INTO menus (id, titulo, rota, icone, ordem, menu_pai_id) VALUES
  (39, 'Empresas Cuidadoras', '/empresas-cuidadoras', 'building', 27, 30)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  rota = EXCLUDED.rota,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  menu_pai_id = EXCLUDED.menu_pai_id;

-- Cuidadores depois das empresas
UPDATE menus SET ordem = 28 WHERE id = 36;
UPDATE menus SET ordem = 29 WHERE id = 37;

SELECT setval(pg_get_serial_sequence('menus', 'id'), GREATEST((SELECT MAX(id) FROM menus), 39));

-- Admin: tudo
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 1, 39, TRUE, TRUE, TRUE, TRUE
ON CONFLICT (perfil_id, menu_id) DO UPDATE SET
  pode_ler = TRUE, pode_criar = TRUE, pode_editar = TRUE, pode_deletar = TRUE;

-- Responsável: pode gerir empresas cuidadoras
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 5, 39, TRUE, TRUE, TRUE, FALSE
ON CONFLICT (perfil_id, menu_id) DO UPDATE SET
  pode_ler = TRUE, pode_criar = TRUE, pode_editar = TRUE, pode_deletar = FALSE;
