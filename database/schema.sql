-- =============================================================================
-- VitaLink — Schema MySQL (SDD)
-- Database: vitalink
-- Charset: utf8mb4
-- =============================================================================

CREATE DATABASE IF NOT EXISTS vitalink
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vitalink;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Módulo: Segurança e Acesso (RBAC)
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS permissoes_acesso;
DROP TABLE IF EXISTS auditoria_logs;
DROP TABLE IF EXISTS medicos;
DROP TABLE IF EXISTS remedios;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS menus;
DROP TABLE IF EXISTS perfis;

CREATE TABLE perfis (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(80) NOT NULL,
  descricao VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_perfis_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE menus (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(120) NOT NULL,
  rota VARCHAR(180) NULL,
  icone VARCHAR(80) NULL,
  ordem INT NOT NULL DEFAULT 0,
  menu_pai_id INT UNSIGNED NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_menus_pai (menu_pai_id),
  KEY idx_menus_ordem (ordem),
  CONSTRAINT fk_menus_pai
    FOREIGN KEY (menu_pai_id) REFERENCES menus (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  status ENUM('ativo', 'inativo', 'bloqueado') NOT NULL DEFAULT 'ativo',
  perfil_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_email (email),
  KEY idx_usuarios_perfil (perfil_id),
  KEY idx_usuarios_status (status),
  CONSTRAINT fk_usuarios_perfil
    FOREIGN KEY (perfil_id) REFERENCES perfis (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissoes_acesso (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  perfil_id INT UNSIGNED NOT NULL,
  menu_id INT UNSIGNED NOT NULL,
  pode_ler TINYINT(1) NOT NULL DEFAULT 0,
  pode_criar TINYINT(1) NOT NULL DEFAULT 0,
  pode_editar TINYINT(1) NOT NULL DEFAULT 0,
  pode_deletar TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_permissoes_perfil_menu (perfil_id, menu_id),
  KEY idx_permissoes_menu (menu_id),
  CONSTRAINT fk_permissoes_perfil
    FOREIGN KEY (perfil_id) REFERENCES perfis (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_permissoes_menu
    FOREIGN KEY (menu_id) REFERENCES menus (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Módulo: Clínico & Prescrição
-- -----------------------------------------------------------------------------

CREATE TABLE medicos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NULL,
  nome VARCHAR(150) NOT NULL,
  crm VARCHAR(20) NOT NULL,
  uf_crm CHAR(2) NOT NULL,
  especialidade VARCHAR(120) NOT NULL,
  telefone VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_medicos_crm_uf (crm, uf_crm),
  KEY idx_medicos_usuario (usuario_id),
  KEY idx_medicos_especialidade (especialidade),
  CONSTRAINT fk_medicos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE remedios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome_comercial VARCHAR(180) NOT NULL,
  principio_ativo VARCHAR(180) NOT NULL,
  concentracao VARCHAR(80) NULL,
  forma_farmaceutica ENUM(
    'comprimido',
    'capsula',
    'xarope',
    'solucao',
    'injecao',
    'pomada',
    'creme',
    'gotas',
    'inalador',
    'outro'
  ) NOT NULL DEFAULT 'comprimido',
  registro_anvisa VARCHAR(40) NULL,
  instrucoes_uso TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_remedios_nome (nome_comercial),
  KEY idx_remedios_principio (principio_ativo),
  KEY idx_remedios_anvisa (registro_anvisa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Módulo: Auditoria e Conformidade (LGPD)
-- Observação: NÃO gravar dados clínicos de pacientes neste log.
-- -----------------------------------------------------------------------------

CREATE TABLE auditoria_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NULL,
  acao VARCHAR(80) NOT NULL,
  recurso VARCHAR(120) NOT NULL,
  recurso_id VARCHAR(64) NULL,
  ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  metadados_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_usuario (usuario_id),
  KEY idx_auditoria_acao (acao),
  KEY idx_auditoria_recurso (recurso),
  KEY idx_auditoria_created (created_at),
  CONSTRAINT fk_auditoria_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Seeds de sistema (RBAC apenas — sem dados clínicos de pacientes)
-- Senha do admin: Admin@Vitalink1
-- =============================================================================

INSERT INTO perfis (id, nome, descricao) VALUES
  (1, 'Administrador', 'Acesso total ao sistema'),
  (2, 'Médico', 'Acesso clínico e catálogo de remédios'),
  (3, 'Atendente', 'Acesso operacional limitado');

INSERT INTO menus (id, titulo, rota, icone, ordem, menu_pai_id) VALUES
  (1, 'Dashboard', '/dashboard', 'layout-dashboard', 10, NULL),
  (2, 'Usuários', '/usuarios', 'users', 20, NULL),
  (3, 'Perfis e Permissões', '/perfis', 'shield', 30, NULL),
  (4, 'Médicos', '/medicos', 'stethoscope', 40, NULL),
  (5, 'Remédios', '/remedios', 'pill', 50, NULL),
  (6, 'Auditoria', '/auditoria', 'scroll-text', 60, NULL);

INSERT INTO usuarios (id, nome, email, senha_hash, status, perfil_id) VALUES
  (
    1,
    'Administrador VitaLink',
    'admin@vitalink.local',
    '$2b$10$yzHG6qG1agOXP2CycdHoOeSqq6kn5KnPCYxxTVlUXuZKMGWy/2jta',
    'ativo',
    1
  );

-- Administrador: CRUD completo em todos os menus
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 1, id, 1, 1, 1, 1 FROM menus;

-- Médico: leitura/escrita em clínicos; sem usuários/perfis/auditoria write
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar) VALUES
  (2, 1, 1, 0, 0, 0),
  (2, 4, 1, 1, 1, 0),
  (2, 5, 1, 1, 1, 0);

-- Atendente: leitura operacional
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar) VALUES
  (3, 1, 1, 0, 0, 0),
  (3, 4, 1, 0, 0, 0),
  (3, 5, 1, 0, 0, 0);
