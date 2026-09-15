-- Receita opcional no medicamento, espelhada em exames/receitas
ALTER TABLE exames_receitas
  ADD COLUMN IF NOT EXISTS remedio_id INTEGER NULL
    REFERENCES remedios (id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exames_remedio ON exames_receitas (remedio_id);
