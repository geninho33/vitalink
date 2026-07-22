-- VitaLink - Estrutura inicial do banco de dados
-- Compatível com MySQL 8.0+

CREATE DATABASE IF NOT EXISTS vitalink
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE vitalink;

-- Contas que podem autenticar no sistema.
-- A senha deve ser armazenada somente como hash seguro (Argon2id ou bcrypt).
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(30) NULL,
  status ENUM('PENDENTE', 'ATIVO', 'BLOQUEADO', 'INATIVO') NOT NULL DEFAULT 'PENDENTE',
  email_verificado_em DATETIME NULL,
  ultimo_acesso_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_email (email),
  KEY idx_usuarios_status (status)
) ENGINE=InnoDB;

-- Papéis funcionais do sistema: administrador, paciente, cuidador etc.
CREATE TABLE IF NOT EXISTS perfis_acesso (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(255) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_perfis_acesso_codigo (codigo)
) ENGINE=InnoDB;

-- Um usuário pode possuir mais de um perfil de acesso.
CREATE TABLE IF NOT EXISTS usuarios_perfis_acesso (
  usuario_id BIGINT UNSIGNED NOT NULL,
  perfil_acesso_id SMALLINT UNSIGNED NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, perfil_acesso_id),
  CONSTRAINT fk_upa_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_upa_perfil
    FOREIGN KEY (perfil_acesso_id) REFERENCES perfis_acesso (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Perfis das pessoas cujos dados de saúde são acompanhados.
-- Uma conta pode acessar o próprio paciente e pacientes familiares autorizados.
CREATE TABLE IF NOT EXISTS pacientes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome_completo VARCHAR(150) NOT NULL,
  email VARCHAR(254) NULL,
  sexo ENUM('FEMININO', 'MASCULINO', 'OUTRO', 'NAO_INFORMADO') NOT NULL DEFAULT 'NAO_INFORMADO',
  data_nascimento DATE NULL,
  tipo_sanguineo ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NULL,
  observacoes_medicas TEXT NULL,
  foto_url VARCHAR(500) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pacientes_nome (nome_completo),
  KEY idx_pacientes_ativo (ativo)
) ENGINE=InnoDB;

-- Determina quais pacientes cada conta pode acessar.
CREATE TABLE IF NOT EXISTS usuarios_pacientes (
  usuario_id BIGINT UNSIGNED NOT NULL,
  paciente_id BIGINT UNSIGNED NOT NULL,
  relacionamento ENUM('PROPRIO', 'FAMILIAR', 'CUIDADOR', 'PROFISSIONAL') NOT NULL,
  pode_administrar_acessos BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  concedido_por BIGINT UNSIGNED NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, paciente_id),
  KEY idx_up_paciente_ativo (paciente_id, ativo),
  CONSTRAINT fk_up_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_up_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE,
  CONSTRAINT fk_up_concedido_por
    FOREIGN KEY (concedido_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Menus disponíveis no VitaLink.
CREATE TABLE IF NOT EXISTS menus (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  rota VARCHAR(120) NOT NULL,
  icone VARCHAR(50) NULL,
  ordem SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  menu_pai_id SMALLINT UNSIGNED NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_menus_codigo (codigo),
  UNIQUE KEY uk_menus_rota (rota),
  KEY idx_menus_ordem (ordem),
  CONSTRAINT fk_menus_pai
    FOREIGN KEY (menu_pai_id) REFERENCES menus (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Permissões de cada perfil, separadas por menu e por ação.
CREATE TABLE IF NOT EXISTS permissoes_menu (
  perfil_acesso_id SMALLINT UNSIGNED NOT NULL,
  menu_id SMALLINT UNSIGNED NOT NULL,
  pode_visualizar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_criar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_editar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_excluir BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (perfil_acesso_id, menu_id),
  CONSTRAINT fk_pm_perfil
    FOREIGN KEY (perfil_acesso_id) REFERENCES perfis_acesso (id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_menu
    FOREIGN KEY (menu_id) REFERENCES menus (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Exames enviados para interpretação e acompanhamento na página Evolução.
CREATE TABLE IF NOT EXISTS exames_evolucao (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  paciente_id BIGINT UNSIGNED NOT NULL,
  tipo_exame VARCHAR(150) NOT NULL,
  data_exame DATE NOT NULL,
  especialidade VARCHAR(150) NULL,
  medico_solicitante VARCHAR(150) NULL,
  arquivo_url VARCHAR(500) NOT NULL,
  status_interpretacao ENUM('PENDENTE', 'PROCESSANDO', 'INTERPRETADO', 'ERRO') NOT NULL DEFAULT 'PENDENTE',
  resumo_laudo TEXT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_exames_paciente_tipo_data (paciente_id, tipo_exame, data_exame),
  CONSTRAINT fk_exames_evolucao_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Valores estruturados extraídos automaticamente de exames laboratoriais.
CREATE TABLE IF NOT EXISTS componentes_exame (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  exame_evolucao_id BIGINT UNSIGNED NOT NULL,
  componente VARCHAR(150) NOT NULL,
  valor_decimal DECIMAL(18,6) NULL,
  valor_texto VARCHAR(255) NULL,
  unidade VARCHAR(50) NULL,
  referencia_minima DECIMAL(18,6) NULL,
  referencia_maxima DECIMAL(18,6) NULL,
  classificacao ENUM('ABAIXO', 'NORMAL', 'ACIMA', 'NAO_CLASSIFICADO') NOT NULL DEFAULT 'NAO_CLASSIFICADO',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_componentes_exame_nome (exame_evolucao_id, componente),
  CONSTRAINT fk_componentes_exame
    FOREIGN KEY (exame_evolucao_id) REFERENCES exames_evolucao (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Perfis básicos.
INSERT INTO perfis_acesso (codigo, nome, descricao)
VALUES
  ('ADMIN', 'Administrador', 'Acesso administrativo completo.'),
  ('PACIENTE', 'Paciente', 'Acesso aos próprios dados de saúde.'),
  ('CUIDADOR', 'Familiar ou cuidador', 'Acesso aos pacientes que o autorizaram.'),
  ('PROFISSIONAL', 'Profissional de saúde', 'Acesso clínico concedido pelo paciente.')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  descricao = VALUES(descricao),
  ativo = TRUE;

-- Menus existentes na aplicação.
INSERT INTO menus (codigo, nome, rota, icone, ordem)
VALUES
  ('INICIO', 'Início', '#inicio', 'home', 10),
  ('AGENDA', 'Agenda', '#agenda', 'calendar', 20),
  ('EVENTOS', 'Eventos', '#eventos', 'plus', 30),
  ('LINHA_TEMPO', 'Linha do tempo', '#timeline', 'timeline', 40),
  ('EVOLUCAO', 'Evolução', '#evolucao', 'chart', 50),
  ('MEDICAMENTOS', 'Medicamentos', '#medicamentos', 'pill', 60),
  ('DOCUMENTOS', 'Documentos', '#documentos', 'file', 70),
  ('FICHA_PACIENTE', 'Ficha do paciente', '#perfil', 'user', 80),
  ('USUARIOS', 'Usuários', '#usuarios', 'users', 90),
  ('PERMISSOES', 'Perfis e permissões', '#permissoes', 'shield', 100)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  rota = VALUES(rota),
  icone = VALUES(icone),
  ordem = VALUES(ordem),
  ativo = TRUE;

-- Administrador: controle completo em todos os menus.
INSERT INTO permissoes_menu
  (perfil_acesso_id, menu_id, pode_visualizar, pode_criar, pode_editar, pode_excluir)
SELECT p.id, m.id, TRUE, TRUE, TRUE, TRUE
FROM perfis_acesso p
CROSS JOIN menus m
WHERE p.codigo = 'ADMIN'
ON DUPLICATE KEY UPDATE
  pode_visualizar = TRUE,
  pode_criar = TRUE,
  pode_editar = TRUE,
  pode_excluir = TRUE;

-- Paciente: acesso completo aos menus assistenciais, sem administração de usuários.
INSERT INTO permissoes_menu
  (perfil_acesso_id, menu_id, pode_visualizar, pode_criar, pode_editar, pode_excluir)
SELECT p.id, m.id, TRUE, TRUE, TRUE, TRUE
FROM perfis_acesso p
CROSS JOIN menus m
WHERE p.codigo = 'PACIENTE'
  AND m.codigo IN ('INICIO', 'AGENDA', 'EVENTOS', 'LINHA_TEMPO', 'EVOLUCAO',
                   'MEDICAMENTOS', 'DOCUMENTOS', 'FICHA_PACIENTE')
ON DUPLICATE KEY UPDATE
  pode_visualizar = TRUE,
  pode_criar = TRUE,
  pode_editar = TRUE,
  pode_excluir = TRUE;

-- Cuidador: pode acompanhar e manter informações do paciente autorizado.
INSERT INTO permissoes_menu
  (perfil_acesso_id, menu_id, pode_visualizar, pode_criar, pode_editar, pode_excluir)
SELECT p.id, m.id, TRUE, TRUE, TRUE, FALSE
FROM perfis_acesso p
CROSS JOIN menus m
WHERE p.codigo = 'CUIDADOR'
  AND m.codigo IN ('INICIO', 'AGENDA', 'EVENTOS', 'LINHA_TEMPO', 'EVOLUCAO',
                   'MEDICAMENTOS', 'DOCUMENTOS', 'FICHA_PACIENTE')
ON DUPLICATE KEY UPDATE
  pode_visualizar = TRUE,
  pode_criar = TRUE,
  pode_editar = TRUE,
  pode_excluir = FALSE;

-- Profissional: leitura clínica e inclusão de eventos/documentos.
INSERT INTO permissoes_menu
  (perfil_acesso_id, menu_id, pode_visualizar, pode_criar, pode_editar, pode_excluir)
SELECT
  p.id,
  m.id,
  TRUE,
  IF(m.codigo IN ('EVENTOS', 'DOCUMENTOS'), TRUE, FALSE),
  IF(m.codigo = 'EVENTOS', TRUE, FALSE),
  FALSE
FROM perfis_acesso p
CROSS JOIN menus m
WHERE p.codigo = 'PROFISSIONAL'
  AND m.codigo IN ('INICIO', 'AGENDA', 'EVENTOS', 'LINHA_TEMPO', 'EVOLUCAO',
                   'MEDICAMENTOS', 'DOCUMENTOS', 'FICHA_PACIENTE')
ON DUPLICATE KEY UPDATE
  pode_visualizar = VALUES(pode_visualizar),
  pode_criar = VALUES(pode_criar),
  pode_editar = VALUES(pode_editar),
  pode_excluir = VALUES(pode_excluir);

-- Consulta útil para montar o menu após o login.
CREATE OR REPLACE VIEW vw_permissoes_usuarios AS
SELECT
  u.id AS usuario_id,
  u.nome AS usuario_nome,
  pa.codigo AS perfil_codigo,
  pa.nome AS perfil_nome,
  m.codigo AS menu_codigo,
  m.nome AS menu_nome,
  m.rota,
  m.icone,
  m.ordem,
  pm.pode_visualizar,
  pm.pode_criar,
  pm.pode_editar,
  pm.pode_excluir
FROM usuarios u
INNER JOIN usuarios_perfis_acesso upa ON upa.usuario_id = u.id
INNER JOIN perfis_acesso pa ON pa.id = upa.perfil_acesso_id AND pa.ativo = TRUE
INNER JOIN permissoes_menu pm ON pm.perfil_acesso_id = pa.id
INNER JOIN menus m ON m.id = pm.menu_id AND m.ativo = TRUE
WHERE u.status = 'ATIVO';

-- Exemplo de consulta por usuário (substitua ? pelo ID autenticado):
-- SELECT *
-- FROM vw_permissoes_usuarios
-- WHERE usuario_id = ? AND pode_visualizar = TRUE
-- ORDER BY ordem;
