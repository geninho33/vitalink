-- Ajustes homolog Nov/2026: princípio ativo opcional; responsável/cuidador podem excluir consultas.
-- Idempotente.

ALTER TABLE remedios ALTER COLUMN principio_ativo DROP NOT NULL;

UPDATE permissoes_acesso pa
SET pode_deletar = TRUE, updated_at = NOW()
FROM menus m
WHERE pa.menu_id = m.id
  AND m.rota = '/consultas'
  AND pa.perfil_id IN (4, 5)
  AND pa.pode_deletar IS DISTINCT FROM TRUE;
