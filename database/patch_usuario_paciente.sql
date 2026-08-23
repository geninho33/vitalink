-- Vínculo N:N usuário ↔ paciente (isolamento canônico)
CREATE TABLE IF NOT EXISTS usuario_paciente (
  usuario_id INTEGER NOT NULL REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE CASCADE,
  paciente_id INTEGER NOT NULL REFERENCES pacientes (id) ON UPDATE CASCADE ON DELETE CASCADE,
  papel VARCHAR(40) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, paciente_id)
);
CREATE INDEX IF NOT EXISTS idx_usuario_paciente_paciente ON usuario_paciente (paciente_id);

INSERT INTO usuario_paciente (usuario_id, paciente_id, papel)
SELECT c.usuario_id, p.id, 'cuidador'
FROM pacientes p
INNER JOIN cuidadores c ON c.id = p.cuidador_id
WHERE c.usuario_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO usuario_paciente (usuario_id, paciente_id, papel)
SELECT r.usuario_id, p.id, 'responsavel'
FROM pacientes p
INNER JOIN responsaveis r ON r.id = p.responsavel_id
WHERE r.usuario_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO usuario_paciente (usuario_id, paciente_id, papel)
SELECT pr_u.usuario_id, pr.paciente_id, 'responsavel'
FROM paciente_responsaveis pr
INNER JOIN responsaveis pr_u ON pr_u.id = pr.responsavel_id
WHERE pr_u.usuario_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO usuario_paciente (usuario_id, paciente_id, papel)
SELECT c.usuario_id, v.paciente_id, 'cuidador'
FROM paciente_cuidador_vinculos v
INNER JOIN cuidadores c ON c.id = v.cuidador_id
WHERE c.usuario_id IS NOT NULL AND COALESCE(v.ativo, TRUE) = TRUE
ON CONFLICT DO NOTHING;
