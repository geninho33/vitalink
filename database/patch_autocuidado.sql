-- VitaLink — perfil Autocuidado (id 7)
-- Usuário titular e próprio paciente: CRUD na própria saúde, sem listar terceiros.

INSERT INTO perfis (id, nome, descricao) VALUES
  (7, 'Autocuidado', 'Gestão da própria saúde, sem dependência de terceiros')
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = TRUE;

SELECT setval(
  pg_get_serial_sequence('perfis', 'id'),
  GREATEST((SELECT MAX(id) FROM perfis), 7)
);

DELETE FROM permissoes_acesso WHERE perfil_id = 7;

-- Permissões de API (Início e catálogos da própria saúde).
-- O menu lateral do Autocuidado é filtrado no backend (Dashboard, Sua saúde, Termos).
-- Inclui Pacientes (31) só para GET/PUT da própria ficha — não aparece no menu.
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 7, m.id, TRUE,
  CASE WHEN m.rota IN (
    '/inicio', '/remedios', '/medicos', '/farmacias', '/hospitais',
    '/exames-receitas', '/agenda', '/consultas', '/rotina', '/timeline'
  ) THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota IN (
    '/inicio', '/remedios', '/medicos', '/farmacias', '/hospitais',
    '/exames-receitas', '/agenda', '/consultas', '/rotina', '/timeline', '/pacientes'
  ) THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota IN (
    '/inicio', '/remedios', '/exames-receitas', '/consultas', '/rotina'
  ) THEN TRUE ELSE FALSE END
FROM menus m
WHERE m.id IN (1, 2, 30, 31, 32, 33, 34, 35, 38, 40, 50, 51, 52, 53, 54);

INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE FROM menus
ON CONFLICT (perfil_id, menu_id) DO UPDATE SET
  pode_ler = TRUE, pode_criar = TRUE, pode_editar = TRUE, pode_deletar = TRUE;
