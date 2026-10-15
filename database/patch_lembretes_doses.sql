-- Fase 1 / Etapa 3: lembretes de dose com confirmação e escalonamento. Idempotente.
ALTER TABLE medicamento_doses ADD COLUMN IF NOT EXISTS notificado_em TIMESTAMPTZ NULL;
ALTER TABLE medicamento_doses ADD COLUMN IF NOT EXISTS escalado_em TIMESTAMPTZ NULL;
ALTER TABLE medicamento_doses ADD COLUMN IF NOT EXISTS adiado_ate TIMESTAMPTZ NULL;
ALTER TABLE medicamento_doses ADD COLUMN IF NOT EXISTS confirmado_em TIMESTAMPTZ NULL;
ALTER TABLE medicamento_doses ADD COLUMN IF NOT EXISTS confirmado_por INTEGER NULL
  REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Busca rápida das doses pendentes pelo agendador.
CREATE INDEX IF NOT EXISTS idx_med_doses_pendentes
  ON medicamento_doses (data_hora) WHERE status = 'pendente';

CREATE TABLE IF NOT EXISTS paciente_lembretes_config (
  paciente_id INTEGER PRIMARY KEY REFERENCES pacientes (id) ON UPDATE CASCADE ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  janela_escalonamento_min INTEGER NOT NULL DEFAULT 30,
  notificar_paciente BOOLEAN NOT NULL DEFAULT TRUE,
  notificar_cuidadores BOOLEAN NOT NULL DEFAULT TRUE,
  notificar_responsaveis BOOLEAN NOT NULL DEFAULT TRUE,
  escalar_responsaveis BOOLEAN NOT NULL DEFAULT TRUE,
  mostrar_nome_remedio BOOLEAN NOT NULL DEFAULT FALSE,
  atualizado_por INTEGER NULL REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_plc_janela CHECK (janela_escalonamento_min BETWEEN 1 AND 240)
);
