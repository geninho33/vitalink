-- ============================================================================
-- Patch de Segurança VitaLink — 2026-10-09
-- Correções críticas de segurança: constraints UNIQUE, paciente_id em arquivos,
-- e permissões RBAC para perfis Paciente/Autocuidado
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Campo paciente_id na tabela arquivos (para verificação de escopo)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arquivos' AND column_name = 'paciente_id'
  ) THEN
    ALTER TABLE arquivos ADD COLUMN paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_arquivos_paciente_id ON arquivos(paciente_id);
    RAISE NOTICE 'Coluna paciente_id adicionada à tabela arquivos';
  ELSE
    RAISE NOTICE 'Coluna paciente_id já existe na tabela arquivos';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Constraints UNIQUE para prevenir duplicatas
-- ----------------------------------------------------------------------------

-- 2.1. Email único em usuários
DO $$
BEGIN
  -- Verificar se há duplicatas antes de adicionar constraint
  IF EXISTS (
    SELECT email, COUNT(*)
    FROM usuarios
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY email
    HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'Emails duplicados encontrados na tabela usuarios. Constraint UNIQUE não será adicionada. Execute: SELECT email, COUNT(*) FROM usuarios GROUP BY email HAVING COUNT(*) > 1;';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uk_usuarios_email'
  ) THEN
    ALTER TABLE usuarios ADD CONSTRAINT uk_usuarios_email UNIQUE (email);
    RAISE NOTICE 'Constraint UNIQUE uk_usuarios_email adicionada';
  ELSE
    RAISE NOTICE 'Constraint uk_usuarios_email já existe';
  END IF;
END $$;

-- 2.2. CPF único em usuários
DO $$
BEGIN
  IF EXISTS (
    SELECT cpf, COUNT(*)
    FROM usuarios
    WHERE cpf IS NOT NULL AND cpf <> ''
    GROUP BY cpf
    HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'CPFs duplicados encontrados na tabela usuarios. Constraint UNIQUE não será adicionada. Execute: SELECT cpf, COUNT(*) FROM usuarios GROUP BY cpf HAVING COUNT(*) > 1;';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uk_usuarios_cpf'
  ) THEN
    ALTER TABLE usuarios ADD CONSTRAINT uk_usuarios_cpf UNIQUE (cpf);
    RAISE NOTICE 'Constraint UNIQUE uk_usuarios_cpf adicionada';
  ELSE
    RAISE NOTICE 'Constraint uk_usuarios_cpf já existe';
  END IF;
END $$;

-- 2.3. CPF único em pacientes
DO $$
BEGIN
  IF EXISTS (
    SELECT cpf, COUNT(*)
    FROM pacientes
    WHERE cpf IS NOT NULL AND cpf <> ''
    GROUP BY cpf
    HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'CPFs duplicados encontrados na tabela pacientes. Constraint UNIQUE não será adicionada. Execute: SELECT cpf, COUNT(*) FROM pacientes GROUP BY cpf HAVING COUNT(*) > 1;';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uk_pacientes_cpf'
  ) THEN
    ALTER TABLE pacientes ADD CONSTRAINT uk_pacientes_cpf UNIQUE (cpf);
    RAISE NOTICE 'Constraint UNIQUE uk_pacientes_cpf adicionada';
  ELSE
    RAISE NOTICE 'Constraint uk_pacientes_cpf já existe';
  END IF;
END $$;

-- 2.4. CPF único em responsaveis
DO $$
BEGIN
  IF EXISTS (
    SELECT cpf, COUNT(*)
    FROM responsaveis
    WHERE cpf IS NOT NULL AND cpf <> ''
    GROUP BY cpf
    HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'CPFs duplicados encontrados na tabela responsaveis. Constraint UNIQUE não será adicionada. Execute: SELECT cpf, COUNT(*) FROM responsaveis GROUP BY cpf HAVING COUNT(*) > 1;';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uk_responsaveis_cpf'
  ) THEN
    ALTER TABLE responsaveis ADD CONSTRAINT uk_responsaveis_cpf UNIQUE (cpf);
    RAISE NOTICE 'Constraint UNIQUE uk_responsaveis_cpf adicionada';
  ELSE
    RAISE NOTICE 'Constraint uk_responsaveis_cpf já existe';
  END IF;
END $$;

-- 2.5. CRM + UF únicos em médicos
DO $$
BEGIN
  IF EXISTS (
    SELECT crm, uf, COUNT(*)
    FROM medicos
    WHERE crm IS NOT NULL AND crm <> '' AND uf IS NOT NULL AND uf <> ''
    GROUP BY crm, uf
    HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'Combinações CRM+UF duplicadas encontradas na tabela medicos. Constraint UNIQUE não será adicionada. Execute: SELECT crm, uf, COUNT(*) FROM medicos GROUP BY crm, uf HAVING COUNT(*) > 1;';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uk_medicos_crm_uf'
  ) THEN
    ALTER TABLE medicos ADD CONSTRAINT uk_medicos_crm_uf UNIQUE (crm, uf);
    RAISE NOTICE 'Constraint UNIQUE uk_medicos_crm_uf adicionada';
  ELSE
    RAISE NOTICE 'Constraint uk_medicos_crm_uf já existe';
  END IF;
END $$;

-- 2.6. Vínculos paciente-cuidador únicos (prevenir duplicatas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uk_paciente_cuidador_vinculos'
  ) THEN
    -- Deletar duplicatas antes de adicionar constraint (manter o mais recente)
    DELETE FROM paciente_cuidador_vinculos
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY paciente_id, cuidador_id
          ORDER BY id DESC
        ) AS rn
        FROM paciente_cuidador_vinculos
      ) sub
      WHERE rn > 1
    );
    
    ALTER TABLE paciente_cuidador_vinculos
      ADD CONSTRAINT uk_paciente_cuidador_vinculos UNIQUE (paciente_id, cuidador_id);
    RAISE NOTICE 'Constraint UNIQUE uk_paciente_cuidador_vinculos adicionada (duplicatas removidas se existiam)';
  ELSE
    RAISE NOTICE 'Constraint uk_paciente_cuidador_vinculos já existe';
  END IF;
END $$;

-- 2.7. Vínculos paciente-responsável únicos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uk_paciente_responsaveis'
  ) THEN
    -- Deletar duplicatas antes de adicionar constraint (manter o mais recente)
    DELETE FROM paciente_responsaveis
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY paciente_id, responsavel_id
          ORDER BY id DESC
        ) AS rn
        FROM paciente_responsaveis
      ) sub
      WHERE rn > 1
    );
    
    ALTER TABLE paciente_responsaveis
      ADD CONSTRAINT uk_paciente_responsaveis UNIQUE (paciente_id, responsavel_id);
    RAISE NOTICE 'Constraint UNIQUE uk_paciente_responsaveis adicionada (duplicatas removidas se existiam)';
  ELSE
    RAISE NOTICE 'Constraint uk_paciente_responsaveis já existe';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Permissões RBAC para perfis Paciente (6) e Autocuidado (7)
--    Remove dependência de hard-code no middleware
-- ----------------------------------------------------------------------------

-- 3.1. Inserir menu /pacientes se não existir
INSERT INTO menus (nome, rota, ordem, ativo)
SELECT 'Pacientes', '/pacientes', 200, TRUE
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE rota = '/pacientes');

-- 3.2. Adicionar permissões de leitura e edição para Paciente (perfil 6)
DO $$
DECLARE
  menu_id INTEGER;
BEGIN
  SELECT id INTO menu_id FROM menus WHERE rota = '/pacientes' LIMIT 1;
  
  IF menu_id IS NOT NULL THEN
    -- Permissão de leitura
    IF NOT EXISTS (
      SELECT 1 FROM permissoes_acesso
      WHERE perfil_id = 6 AND menu_id = menu_id AND acao = 'ler'
    ) THEN
      INSERT INTO permissoes_acesso (perfil_id, menu_id, acao)
      VALUES (6, menu_id, 'ler');
      RAISE NOTICE 'Permissão de leitura em /pacientes adicionada para perfil Paciente (6)';
    END IF;
    
    -- Permissão de edição
    IF NOT EXISTS (
      SELECT 1 FROM permissoes_acesso
      WHERE perfil_id = 6 AND menu_id = menu_id AND acao = 'editar'
    ) THEN
      INSERT INTO permissoes_acesso (perfil_id, menu_id, acao)
      VALUES (6, menu_id, 'editar');
      RAISE NOTICE 'Permissão de edição em /pacientes adicionada para perfil Paciente (6)';
    END IF;
  END IF;
END $$;

-- 3.3. Adicionar permissões de leitura e edição para Autocuidado (perfil 7)
DO $$
DECLARE
  menu_id INTEGER;
BEGIN
  SELECT id INTO menu_id FROM menus WHERE rota = '/pacientes' LIMIT 1;
  
  IF menu_id IS NOT NULL THEN
    -- Permissão de leitura
    IF NOT EXISTS (
      SELECT 1 FROM permissoes_acesso
      WHERE perfil_id = 7 AND menu_id = menu_id AND acao = 'ler'
    ) THEN
      INSERT INTO permissoes_acesso (perfil_id, menu_id, acao)
      VALUES (7, menu_id, 'ler');
      RAISE NOTICE 'Permissão de leitura em /pacientes adicionada para perfil Autocuidado (7)';
    END IF;
    
    -- Permissão de edição
    IF NOT EXISTS (
      SELECT 1 FROM permissoes_acesso
      WHERE perfil_id = 7 AND menu_id = menu_id AND acao = 'editar'
    ) THEN
      INSERT INTO permissoes_acesso (perfil_id, menu_id, acao)
      VALUES (7, menu_id, 'editar');
      RAISE NOTICE 'Permissão de edição em /pacientes adicionada para perfil Autocuidado (7)';
    END IF;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Fim do patch de segurança
-- ============================================================================
