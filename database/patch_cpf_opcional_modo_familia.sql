-- Fase 0 / Etapa 1: CPF do paciente opcional + modo família.
-- Idempotente: pode ser executado várias vezes.

-- 1) CPF do paciente passa a ser opcional.
ALTER TABLE pacientes ALTER COLUMN cpf DROP NOT NULL;

-- 2) Strings vazias viram NULL (não colidem entre si no índice único).
UPDATE pacientes SET cpf = NULL WHERE cpf IS NOT NULL AND btrim(cpf) = '';

-- 3) Unicidade só para CPFs preenchidos (índice único parcial).
--    Só troca a constraint antiga se não houver duplicados; senão mantém tudo como está.
DO $$
BEGIN
  IF EXISTS (
    SELECT cpf FROM pacientes WHERE cpf IS NOT NULL GROUP BY cpf HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'CPFs duplicados em pacientes; índice uk_pacientes_cpf_nn não criado.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uk_pacientes_cpf_nn ON pacientes (cpf) WHERE cpf IS NOT NULL;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_pacientes_cpf') THEN
      ALTER TABLE pacientes DROP CONSTRAINT uk_pacientes_cpf;
    END IF;
  END IF;
END $$;

-- 4) Flag de modo família no usuário (familiar, não clínica).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS modo_familia BOOLEAN NOT NULL DEFAULT FALSE;
