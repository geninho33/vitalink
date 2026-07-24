const { query, isDuplicateKey } = require('../config/database');
const { writeAudit } = require('../services/audit.service');

async function listMedicos(req, res, next) {
  try {
    const rows = await query(
      `SELECT id, usuario_id, nome, crm, uf_crm, especialidade, telefone, email,
              created_at, updated_at
       FROM medicos
       ORDER BY nome ASC`
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function createMedico(req, res, next) {
  try {
    const { usuario_id, nome, crm, uf_crm, especialidade, telefone, email } =
      req.body || {};

    if (!nome || !crm || !uf_crm || !especialidade) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Campos obrigatórios: nome, crm, uf_crm, especialidade.',
      });
    }

    const result = await query(
      `INSERT INTO medicos
        (usuario_id, nome, crm, uf_crm, especialidade, telefone, email)
       VALUES
        (:usuario_id, :nome, :crm, :uf_crm, :especialidade, :telefone, :email)`,
      {
        usuario_id: usuario_id || null,
        nome,
        crm,
        uf_crm: String(uf_crm).toUpperCase(),
        especialidade,
        telefone: telefone || null,
        email: email || null,
      }
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'medicos',
      recursoId: result.insertId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (isDuplicateKey(err)) {
      err.status = 409;
      err.message = 'CRM/UF já cadastrado.';
    }
    return next(err);
  }
}

async function updateMedico(req, res, next) {
  try {
    const { id } = req.params;
    const { usuario_id, nome, crm, uf_crm, especialidade, telefone, email } =
      req.body || {};

    await query(
      `UPDATE medicos SET
         usuario_id = COALESCE(:usuario_id, usuario_id),
         nome = COALESCE(:nome, nome),
         crm = COALESCE(:crm, crm),
         uf_crm = COALESCE(:uf_crm, uf_crm),
         especialidade = COALESCE(:especialidade, especialidade),
         telefone = COALESCE(:telefone, telefone),
         email = COALESCE(:email, email)
       WHERE id = :id`,
      {
        id,
        usuario_id: usuario_id ?? null,
        nome: nome ?? null,
        crm: crm ?? null,
        uf_crm: uf_crm ? String(uf_crm).toUpperCase() : null,
        especialidade: especialidade ?? null,
        telefone: telefone ?? null,
        email: email ?? null,
      }
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'medicos',
      recursoId: id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteMedico(req, res, next) {
  try {
    const { id } = req.params;
    await query(`DELETE FROM medicos WHERE id = :id`, { id });
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'deletar',
      recurso: 'medicos',
      recursoId: id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMedicos,
  createMedico,
  updateMedico,
  deleteMedico,
};
