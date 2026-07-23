-- =============================================================================
-- VitaLink — Atividades, Anamnese e menus
-- =============================================================================
USE vitalink;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS agenda_eventos;
DROP TABLE IF EXISTS atendimento_execucoes;
DROP TABLE IF EXISTS atendimentos_rotina;
DROP TABLE IF EXISTS consultas;
DROP TABLE IF EXISTS paciente_anamnese;

CREATE TABLE paciente_anamnese (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  paciente_id INT UNSIGNED NOT NULL,
  doencas_preexistentes TEXT NULL,
  historico_familiar TEXT NULL,
  cirurgias_anteriores TEXT NULL,
  sono TEXT NULL,
  alimentacao TEXT NULL,
  mobilidade TEXT NULL,
  autonomia TEXT NULL,
  medicamentos_contraindicados TEXT NULL,
  alergias_alimentares TEXT NULL,
  limitacoes_fisicas_cognitivas TEXT NULL,
  instrucoes_cuidadores TEXT NULL,
  episodios_confusao TEXT NULL,
  contato_emergencia_nome VARCHAR(150) NULL,
  contato_emergencia_telefone VARCHAR(30) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_anamnese_paciente (paciente_id),
  CONSTRAINT fk_anamnese_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  paciente_id INT UNSIGNED NOT NULL,
  medico_id INT UNSIGNED NULL,
  profissional_nome VARCHAR(150) NOT NULL,
  especialidade VARCHAR(120) NOT NULL,
  local_tipo ENUM('clinica','hospital','domiciliar','outro') NOT NULL DEFAULT 'clinica',
  hospital_clinica_id INT UNSIGNED NULL,
  local_descricao VARCHAR(255) NULL,
  data_hora DATETIME NOT NULL,
  status ENUM('pendente','concluido','atrasado','cancelado') NOT NULL DEFAULT 'pendente',
  lembrete_minutos INT UNSIGNED NULL DEFAULT 60,
  anotacoes_pos TEXT NULL,
  observacoes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consultas_paciente (paciente_id),
  KEY idx_consultas_data (data_hora),
  KEY idx_consultas_status (status),
  CONSTRAINT fk_consultas_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_consultas_medico FOREIGN KEY (medico_id) REFERENCES medicos (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_consultas_hospital FOREIGN KEY (hospital_clinica_id) REFERENCES hospitais_clinicas (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE atendimentos_rotina (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  paciente_id INT UNSIGNED NOT NULL,
  tipo ENUM('medicamento','pressao','glicemia','banho','curativo','outro') NOT NULL DEFAULT 'medicamento',
  remedio_id INT UNSIGNED NULL,
  titulo VARCHAR(180) NOT NULL,
  descricao TEXT NULL,
  horario TIME NOT NULL,
  dias_semana VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5,6,7',
  data_inicio DATE NOT NULL,
  data_fim DATE NULL,
  status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rotina_paciente (paciente_id),
  KEY idx_rotina_status (status),
  CONSTRAINT fk_rotina_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_rotina_remedio FOREIGN KEY (remedio_id) REFERENCES remedios (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE atendimento_execucoes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  atendimento_rotina_id INT UNSIGNED NOT NULL,
  paciente_id INT UNSIGNED NOT NULL,
  data_hora_prevista DATETIME NOT NULL,
  data_hora_realizada DATETIME NULL,
  status ENUM('pendente','concluido','atrasado','nao_realizado','cancelado') NOT NULL DEFAULT 'pendente',
  motivo_nao_realizacao VARCHAR(255) NULL,
  executado_por INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_execucao_rotina_prevista (atendimento_rotina_id, data_hora_prevista),
  KEY idx_execucao_paciente_data (paciente_id, data_hora_prevista),
  KEY idx_execucao_status (status),
  CONSTRAINT fk_execucao_rotina FOREIGN KEY (atendimento_rotina_id) REFERENCES atendimentos_rotina (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_execucao_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_execucao_usuario FOREIGN KEY (executado_por) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE agenda_eventos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  paciente_id INT UNSIGNED NOT NULL,
  tipo ENUM('consulta','medicamento','cuidado','sessao','outro') NOT NULL DEFAULT 'outro',
  origem_tabela VARCHAR(40) NOT NULL,
  origem_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  descricao TEXT NULL,
  data_hora_inicio DATETIME NOT NULL,
  data_hora_fim DATETIME NULL,
  status ENUM('pendente','concluido','atrasado','cancelado','nao_realizado') NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_agenda_origem (origem_tabela, origem_id),
  KEY idx_agenda_paciente_data (paciente_id, data_hora_inicio),
  KEY idx_agenda_status (status),
  KEY idx_agenda_tipo (tipo),
  CONSTRAINT fk_agenda_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Perfis adicionais
INSERT IGNORE INTO perfis (id, nome, descricao) VALUES
  (4, 'Cuidador', 'Execução de rotinas e confirmação de doses'),
  (5, 'Responsável', 'Acompanhamento familiar do paciente');

-- Menus: Dashboard → Saúde → Atividades → Administração
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
  (50, 'Atividades', NULL, 'calendar', 50, NULL),
  (51, 'Agenda do Paciente', '/agenda', 'calendar', 51, 50),
  (52, 'Consultas e Sessões', '/consultas', 'stethoscope', 52, 50),
  (53, 'Medicamentos e Atendimento', '/rotina', 'pill', 53, 50),
  (54, 'Linha do Tempo', '/timeline', 'scroll-text', 54, 50),
  (10, 'Administração', NULL, 'settings', 90, NULL),
  (11, 'Usuários', '/usuarios', 'users', 91, 10),
  (12, 'Perfis', '/perfis', 'masks', 92, 10),
  (13, 'Acessos', '/acessos', 'key', 93, 10),
  (14, 'Auditoria', '/auditoria', 'scroll-text', 94, 10);

INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 1, id, 1, 1, 1, 1 FROM menus;

-- Médico
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 2, id, 1, IF(rota IN ('/pacientes','/medicos','/remedios','/consultas','/agenda','/timeline','/rotina') OR titulo IN ('Saúde','Atividades','Dashboard'), 1, 0),
       IF(rota IN ('/pacientes','/medicos','/remedios','/consultas','/rotina'), 1, 0),
       0
FROM menus WHERE id IN (1,30,31,32,33,34,35,50,51,52,53,54);

-- Cuidador
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 4, id, 1,
       IF(rota IN ('/rotina','/agenda','/timeline'), 1, 0),
       IF(rota IN ('/rotina'), 1, 0),
       0
FROM menus WHERE id IN (1,30,31,50,51,53,54);

-- Responsável
INSERT INTO permissoes_acesso (perfil_id, menu_id, pode_ler, pode_criar, pode_editar, pode_deletar)
SELECT 5, id, 1, 0, 0, 0
FROM menus WHERE id IN (1,50,51,54);
