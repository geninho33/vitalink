-- Telefone no usuário, dono em estabelecimentos e permissão da própria ficha (Autocuidado).

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(30) NULL;

ALTER TABLE hospitais_clinicas
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER NULL REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hospitais_usuario ON hospitais_clinicas (usuario_id);

ALTER TABLE farmacias
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER NULL REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_farmacias_usuario ON farmacias (usuario_id);

-- Autocuidado: leitura/edição da própria ficha (menu 31) sem criar/deletar terceiros.
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 7, 31, TRUE, FALSE, TRUE, FALSE
WHERE EXISTS (SELECT 1 FROM menus WHERE id = 31)
ON CONFLICT (perfil_id, menu_id) DO UPDATE SET
  pode_ler = TRUE,
  pode_criar = FALSE,
  pode_editar = TRUE,
  pode_deletar = FALSE;
