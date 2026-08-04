-- VitaLink Onda 2 — RBAC, 1:N vínculos, medicamentos, exames/receitas (idempotente)

-- =============================================================================
-- Menus: renomes + Exames/Receitas
-- =============================================================================
UPDATE menus SET titulo = 'Profissionais da Saúde', ordem = 22 WHERE id = 32;
UPDATE menus SET titulo = 'Medicamentos', ordem = 23 WHERE id = 33;
UPDATE menus SET titulo = 'Estabelecimentos de Saúde', ordem = 25 WHERE id = 34;
UPDATE menus SET titulo = 'Eventos', ordem = 53 WHERE id = 53;

INSERT INTO menus (id, titulo, rota, icone, ordem, menu_pai_id) VALUES
  (38, 'Exames / Receitas', '/exames-receitas', 'file-text', 24, 30)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  rota = EXCLUDED.rota,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem,
  menu_pai_id = EXCLUDED.menu_pai_id;

UPDATE menus SET ordem = 26 WHERE id = 35;
UPDATE menus SET ordem = 27 WHERE id = 36;
UPDATE menus SET ordem = 28 WHERE id = 37;

SELECT setval(pg_get_serial_sequence('menus', 'id'), GREATEST((SELECT MAX(id) FROM menus), 38));

-- =============================================================================
-- Perfis: desativar Médico (2) e Atendente (3)
-- =============================================================================
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS ordem_exibicao INTEGER NOT NULL DEFAULT 100;

UPDATE perfis SET ativo = FALSE, ordem_exibicao = 90 WHERE id IN (2, 3);
UPDATE perfis SET nome = 'Administrador', descricao = 'Acesso total / moderador (pode ser paciente autônomo)', ordem_exibicao = 1, ativo = TRUE WHERE id = 1;
UPDATE perfis SET nome = 'Responsável', descricao = 'Supervisiona cuidadores e pacientes não autônomos', ordem_exibicao = 2, ativo = TRUE WHERE id = 5;
UPDATE perfis SET nome = 'Cuidador', descricao = 'Profissional subordinado ao Responsável/Admin', ordem_exibicao = 3, ativo = TRUE WHERE id = 4;
UPDATE perfis SET nome = 'Paciente', descricao = 'Usuário autônomo do próprio prontuário', ordem_exibicao = 4, ativo = TRUE WHERE id = 6;

DELETE FROM usuario_perfis
WHERE usuario_id = 1 AND perfil_id = 6 AND paciente_id IS NULL;

UPDATE usuarios SET perfil_id = 5 WHERE perfil_id IN (2, 3);
UPDATE usuario_perfis SET perfil_id = 5, rotulo = 'Responsável'
WHERE perfil_id IN (2, 3);

DELETE FROM permissoes_acesso WHERE perfil_id IN (2, 3);

-- Admin: tudo
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE FROM menus
ON CONFLICT (perfil_id, menu_id) DO UPDATE SET
  pode_ler = TRUE, pode_criar = TRUE, pode_editar = TRUE, pode_deletar = TRUE;

-- Responsável (sem menu Responsáveis)
DELETE FROM permissoes_acesso WHERE perfil_id = 5;
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 5, m.id, TRUE,
  CASE WHEN m.rota IN ('/inicio','/pacientes','/medicos','/remedios','/farmacias','/agenda','/rotina','/timeline','/exames-receitas') THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota IN ('/inicio','/pacientes','/medicos','/remedios','/farmacias','/agenda','/rotina','/exames-receitas') THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota IN ('/inicio','/pacientes') THEN TRUE ELSE FALSE END
FROM menus m
WHERE m.id IN (1, 2, 30, 31, 32, 33, 35, 38, 50, 51, 53, 54);

-- Cuidador: ler pacientes/meds; sem create/edit/delete em medicamentos
DELETE FROM permissoes_acesso WHERE perfil_id = 4;
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 4, m.id, TRUE, FALSE, FALSE, FALSE
FROM menus m
WHERE m.id IN (1, 2, 30, 31, 33, 50, 51, 53, 54);

-- Paciente
DELETE FROM permissoes_acesso WHERE perfil_id = 6;
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 6, m.id, TRUE,
  CASE WHEN m.rota = '/inicio' THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota = '/inicio' THEN TRUE ELSE FALSE END,
  CASE WHEN m.rota = '/inicio' THEN TRUE ELSE FALSE END
FROM menus m WHERE m.id IN (1, 2);

-- =============================================================================
-- Pacientes: sexo + 1:N
-- =============================================================================
DO $$ BEGIN
  ALTER TABLE pacientes ADD COLUMN sexo TEXT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS pacientes_sexo_check;
ALTER TABLE pacientes ADD CONSTRAINT pacientes_sexo_check
  CHECK (sexo IS NULL OR sexo IN ('masculino', 'feminino', 'outro', 'nao_informado'));

CREATE TABLE IF NOT EXISTS paciente_medicos (
  paciente_id INTEGER NOT NULL REFERENCES pacientes (id) ON UPDATE CASCADE ON DELETE CASCADE,
  medico_id INTEGER NOT NULL REFERENCES medicos (id) ON UPDATE CASCADE ON DELETE CASCADE,
  principal BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (paciente_id, medico_id)
);

CREATE TABLE IF NOT EXISTS paciente_responsaveis (
  paciente_id INTEGER NOT NULL REFERENCES pacientes (id) ON UPDATE CASCADE ON DELETE CASCADE,
  responsavel_id INTEGER NOT NULL REFERENCES responsaveis (id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (paciente_id, responsavel_id)
);

INSERT INTO paciente_medicos (paciente_id, medico_id, principal)
SELECT id, medico_id, TRUE FROM pacientes WHERE medico_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO paciente_responsaveis (paciente_id, responsavel_id)
SELECT id, responsavel_id FROM pacientes WHERE responsavel_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS medico_estabelecimentos (
  medico_id INTEGER NOT NULL REFERENCES medicos (id) ON UPDATE CASCADE ON DELETE CASCADE,
  hospital_clinica_id INTEGER NOT NULL REFERENCES hospitais_clinicas (id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (medico_id, hospital_clinica_id)
);

INSERT INTO medico_estabelecimentos (medico_id, hospital_clinica_id)
SELECT id, hospital_clinica_id FROM medicos WHERE hospital_clinica_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE medicos ALTER COLUMN hospital_clinica_id DROP NOT NULL;
ALTER TABLE medicos ALTER COLUMN telefone_principal DROP NOT NULL;

-- =============================================================================
-- Cuidadores / Responsáveis sem usuário obrigatório
-- =============================================================================
ALTER TABLE cuidadores ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE responsaveis ALTER COLUMN usuario_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS empresas_cuidadoras (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  razao_social VARCHAR(180) NULL,
  nome_fantasia VARCHAR(180) NOT NULL,
  cnpj VARCHAR(18) NULL,
  telefone VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  pessoa_responsavel VARCHAR(150) NULL,
  cep CHAR(8) NULL,
  logradouro VARCHAR(180) NULL,
  numero VARCHAR(20) NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NULL,
  cidade VARCHAR(120) NULL,
  uf CHAR(2) NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cuidadores ADD COLUMN IF NOT EXISTS empresa_cuidadora_id INTEGER NULL
  REFERENCES empresas_cuidadoras (id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS paciente_cuidador_vinculos (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes (id) ON UPDATE CASCADE ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pj', 'pf')),
  empresa_cuidadora_id INTEGER NULL REFERENCES empresas_cuidadoras (id) ON UPDATE CASCADE ON DELETE SET NULL,
  cuidador_id INTEGER NULL REFERENCES cuidadores (id) ON UPDATE CASCADE ON DELETE SET NULL,
  nome_escalado VARCHAR(150) NULL,
  contato_escalado VARCHAR(30) NULL,
  profissional_nome VARCHAR(150) NULL,
  profissional_cpf VARCHAR(14) NULL,
  contato VARCHAR(30) NULL,
  cep CHAR(8) NULL,
  logradouro VARCHAR(180) NULL,
  numero VARCHAR(20) NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NULL,
  cidade VARCHAR(120) NULL,
  uf CHAR(2) NULL,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_termino DATE NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pcv_paciente ON paciente_cuidador_vinculos (paciente_id);

-- =============================================================================
-- Medicamentos
-- =============================================================================
ALTER TABLE remedios ADD COLUMN IF NOT EXISTS laboratorio VARCHAR(180) NULL;
ALTER TABLE remedios ADD COLUMN IF NOT EXISTS numero_controle_pessoal VARCHAR(80) NULL;
ALTER TABLE remedios ADD COLUMN IF NOT EXISTS quantidade_administrar VARCHAR(120) NULL;
ALTER TABLE remedios ADD COLUMN IF NOT EXISTS quantidade_estoque NUMERIC(12,2) NULL DEFAULT 0;
ALTER TABLE remedios ADD COLUMN IF NOT EXISTS indicacao TEXT NULL;
ALTER TABLE remedios ADD COLUMN IF NOT EXISTS medico_prescritor_id INTEGER NULL
  REFERENCES medicos (id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE remedios ADD COLUMN IF NOT EXISTS hora_exata TIME NULL;

CREATE TABLE IF NOT EXISTS medicamento_administracoes (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  remedio_id INTEGER NOT NULL REFERENCES remedios (id) ON UPDATE CASCADE ON DELETE CASCADE,
  paciente_id INTEGER NULL REFERENCES pacientes (id) ON UPDATE CASCADE ON DELETE SET NULL,
  usuario_id INTEGER NULL REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL,
  quantidade VARCHAR(80) NULL,
  administrado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacoes TEXT NULL
);

-- =============================================================================
-- Exames / Receitas
-- =============================================================================
CREATE TABLE IF NOT EXISTS exames_receitas (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes (id) ON UPDATE CASCADE ON DELETE CASCADE,
  especialidade VARCHAR(120) NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'exame'
    CHECK (tipo IN ('exame', 'receita', 'pedido_exame', 'resultado', 'laudo', 'outro')),
  titulo VARCHAR(180) NOT NULL,
  data_documento DATE NOT NULL DEFAULT CURRENT_DATE,
  arquivo_id INTEGER NULL REFERENCES arquivos (id) ON UPDATE CASCADE ON DELETE SET NULL,
  consulta_id INTEGER NULL REFERENCES consultas (id) ON UPDATE CASCADE ON DELETE SET NULL,
  agenda_evento_id INTEGER NULL REFERENCES agenda_eventos (id) ON UPDATE CASCADE ON DELETE SET NULL,
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exames_paciente ON exames_receitas (paciente_id);
CREATE INDEX IF NOT EXISTS idx_exames_especialidade ON exames_receitas (especialidade);
CREATE INDEX IF NOT EXISTS idx_exames_data ON exames_receitas (data_documento DESC);
