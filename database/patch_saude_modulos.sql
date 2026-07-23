-- =============================================================================
-- VitaLink — Módulo Saúde (tabelas + menus)
-- Adições além do SDD base:
--   status ativo/inativo, foto_url, convênio (pacientes), timestamps
-- =============================================================================
USE vitalink;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS pacientes;
DROP TABLE IF EXISTS cuidadores;
DROP TABLE IF EXISTS responsaveis;
DROP TABLE IF EXISTS farmacias;
DROP TABLE IF EXISTS hospitais_clinicas;

-- Recria médicos com vínculo hospitalar e endereço
DROP TABLE IF EXISTS medicos;

CREATE TABLE hospitais_clinicas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  razao_social VARCHAR(180) NOT NULL,
  nome_fantasia VARCHAR(180) NOT NULL,
  tipo_documento ENUM('cnpj', 'cpf') NOT NULL DEFAULT 'cnpj',
  documento VARCHAR(18) NOT NULL,
  telefone_principal VARCHAR(30) NOT NULL,
  telefone_secundario VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  cep CHAR(8) NOT NULL,
  logradouro VARCHAR(180) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL,
  observacoes TEXT NULL,
  status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_hospitais_documento (documento),
  KEY idx_hospitais_nome (nome_fantasia),
  KEY idx_hospitais_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE farmacias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  razao_social VARCHAR(180) NOT NULL,
  nome_fantasia VARCHAR(180) NOT NULL,
  tipo_documento ENUM('cnpj', 'cpf') NOT NULL DEFAULT 'cnpj',
  documento VARCHAR(18) NOT NULL,
  telefone_principal VARCHAR(30) NOT NULL,
  telefone_secundario VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  cep CHAR(8) NOT NULL,
  logradouro VARCHAR(180) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL,
  observacoes TEXT NULL,
  status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_farmacias_documento (documento),
  KEY idx_farmacias_nome (nome_fantasia),
  KEY idx_farmacias_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cuidadores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  nome VARCHAR(150) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  telefone_principal VARCHAR(30) NOT NULL,
  telefone_secundario VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  foto_url TEXT NULL,
  turno VARCHAR(80) NULL,
  especialidade VARCHAR(120) NULL,
  cep CHAR(8) NOT NULL,
  logradouro VARCHAR(180) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL,
  observacoes TEXT NULL,
  status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cuidadores_usuario (usuario_id),
  UNIQUE KEY uk_cuidadores_cpf (cpf),
  KEY idx_cuidadores_status (status),
  CONSTRAINT fk_cuidadores_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE responsaveis (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  nome VARCHAR(150) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  telefone_principal VARCHAR(30) NOT NULL,
  telefone_secundario VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  foto_url TEXT NULL,
  grau_parentesco VARCHAR(80) NULL,
  cep CHAR(8) NOT NULL,
  logradouro VARCHAR(180) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL,
  observacoes TEXT NULL,
  status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_responsaveis_usuario (usuario_id),
  UNIQUE KEY uk_responsaveis_cpf (cpf),
  KEY idx_responsaveis_status (status),
  CONSTRAINT fk_responsaveis_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medicos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NULL,
  hospital_clinica_id INT UNSIGNED NOT NULL,
  nome VARCHAR(150) NOT NULL,
  crm VARCHAR(20) NOT NULL,
  uf_crm CHAR(2) NOT NULL,
  especialidade VARCHAR(120) NULL,
  telefone_principal VARCHAR(30) NOT NULL,
  telefone_secundario VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  cep CHAR(8) NULL,
  logradouro VARCHAR(180) NULL,
  numero VARCHAR(20) NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NULL,
  cidade VARCHAR(120) NULL,
  uf CHAR(2) NULL,
  observacoes TEXT NULL,
  status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_medicos_crm_uf (crm, uf_crm),
  KEY idx_medicos_usuario (usuario_id),
  KEY idx_medicos_hospital (hospital_clinica_id),
  KEY idx_medicos_status (status),
  CONSTRAINT fk_medicos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_medicos_hospital
    FOREIGN KEY (hospital_clinica_id) REFERENCES hospitais_clinicas (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pacientes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  diagnostico_principal VARCHAR(255) NOT NULL,
  alergias TEXT NULL,
  tipo_sanguineo ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','NI') NOT NULL DEFAULT 'NI',
  foto_url TEXT NULL,
  telefone_principal VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  convenio_nome VARCHAR(120) NULL,
  convenio_numero VARCHAR(60) NULL,
  convenio_validade DATE NULL,
  responsavel_id INT UNSIGNED NULL,
  cuidador_id INT UNSIGNED NULL,
  medico_id INT UNSIGNED NULL,
  cep CHAR(8) NULL,
  logradouro VARCHAR(180) NULL,
  numero VARCHAR(20) NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(120) NULL,
  cidade VARCHAR(120) NULL,
  uf CHAR(2) NULL,
  observacoes TEXT NULL,
  status ENUM('ativo', 'inativo') NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pacientes_cpf (cpf),
  KEY idx_pacientes_status (status),
  KEY idx_pacientes_responsavel (responsavel_id),
  KEY idx_pacientes_cuidador (cuidador_id),
  KEY idx_pacientes_medico (medico_id),
  CONSTRAINT fk_pacientes_responsavel
    FOREIGN KEY (responsavel_id) REFERENCES responsaveis (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_pacientes_cuidador
    FOREIGN KEY (cuidador_id) REFERENCES cuidadores (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_pacientes_medico
    FOREIGN KEY (medico_id) REFERENCES medicos (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Status em remédios (se coluna não existir, ignore erro em installs limpos via schema)
ALTER TABLE remedios
  ADD COLUMN status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo' AFTER instrucoes_uso;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- Menus: Dashboard → Saúde → Administração (último)
-- -----------------------------------------------------------------------------
DELETE FROM permissoes_acesso;
DELETE FROM menus;

INSERT INTO menus (id, titulo, rota, icone, ordem, menu_pai_id) VALUES
  (1,  'Dashboard', '/dashboard', 'layout-dashboard', 10, NULL),
  (30, 'Saúde', NULL, 'heart-pulse', 20, NULL),
  (31, 'Pacientes', '/pacientes', 'user', 21, 30),
  (32, 'Médicos', '/medicos', 'stethoscope', 22, 30),
  (33, 'Remédios', '/remedios', 'pill', 23, 30),
  (34, 'Hospitais / Clínicas', '/hospitais', 'building', 24, 30),
  (35, 'Farmácias', '/farmacias', 'store', 25, 30),
  (36, 'Cuidadores', '/cuidadores', 'handshake', 26, 30),
  (37, 'Responsáveis', '/responsaveis', 'users', 27, 30),
  (10, 'Administração', NULL, 'settings', 90, NULL),
  (11, 'Usuários', '/usuarios', 'users', 91, 10),
  (12, 'Perfis', '/perfis', 'masks', 92, 10),
  (13, 'Acessos', '/acessos', 'key', 93, 10),
  (14, 'Auditoria', '/auditoria', 'scroll-text', 94, 10);

INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 1, id, 1, 1, 1, 1 FROM menus;

INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar) VALUES
  (2, 1, 1, 0, 0, 0),
  (2, 30, 1, 0, 0, 0),
  (2, 31, 1, 1, 1, 0),
  (2, 32, 1, 1, 1, 0),
  (2, 33, 1, 1, 1, 0),
  (2, 34, 1, 0, 0, 0),
  (2, 35, 1, 0, 0, 0);

INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar) VALUES
  (3, 1, 1, 0, 0, 0),
  (3, 30, 1, 0, 0, 0),
  (3, 31, 1, 0, 0, 0),
  (3, 33, 1, 0, 0, 0);
