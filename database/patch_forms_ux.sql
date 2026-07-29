-- VitaLink — formulários UX: médicos (cpf/foto/turno) + remédios (uso contínuo / período)
-- Idempotente

ALTER TABLE medicos ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) NULL;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS foto_url TEXT NULL;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS turno VARCHAR(80) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_medicos_cpf
  ON medicos (cpf) WHERE cpf IS NOT NULL AND cpf <> '';

ALTER TABLE remedios ADD COLUMN IF NOT EXISTS uso_continuo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE remedios ADD COLUMN IF NOT EXISTS periodo_horario TEXT NOT NULL DEFAULT 'manha';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'remedios_periodo_horario_check'
  ) THEN
    ALTER TABLE remedios
      ADD CONSTRAINT remedios_periodo_horario_check
      CHECK (periodo_horario IN ('manha', 'tarde', 'noite', 'personalizado'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE remedios
SET periodo_horario = 'manha'
WHERE periodo_horario IS NULL OR periodo_horario = '';
