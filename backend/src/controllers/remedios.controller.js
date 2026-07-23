const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');

async function listRemedios(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    let rows;
    if (q) {
      rows = await query(
        `SELECT * FROM remedios
         WHERE nome_comercial LIKE :like OR principio_ativo LIKE :like
         ORDER BY nome_comercial ASC`,
        { like: `%${q}%` }
      );
    } else {
      rows = await query(`SELECT * FROM remedios ORDER BY nome_comercial ASC`);
    }
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function getRemedio(req, res, next) {
  try {
    const rows = await query(`SELECT * FROM remedios WHERE id = :id LIMIT 1`, {
      id: req.params.id,
    });
    if (!rows[0]) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Remédio não encontrado.',
      });
    }
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function createRemedio(req, res, next) {
  try {
    const {
      nome_comercial,
      principio_ativo,
      concentracao,
      forma_farmaceutica = 'comprimido',
      registro_anvisa,
      instrucoes_uso,
    } = req.body || {};

    if (!nome_comercial || !principio_ativo) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Campos obrigatórios: nome_comercial, principio_ativo.',
      });
    }

    const result = await query(
      `INSERT INTO remedios
        (nome_comercial, principio_ativo, concentracao, forma_farmaceutica,
         registro_anvisa, instrucoes_uso)
       VALUES
        (:nome_comercial, :principio_ativo, :concentracao, :forma_farmaceutica,
         :registro_anvisa, :instrucoes_uso)`,
      {
        nome_comercial,
        principio_ativo,
        concentracao: concentracao || null,
        forma_farmaceutica,
        registro_anvisa: registro_anvisa || null,
        instrucoes_uso: instrucoes_uso || null,
      }
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'remedios',
      recursoId: result.insertId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: { forma_farmaceutica },
    });

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

async function updateRemedio(req, res, next) {
  try {
    const { id } = req.params;
    const {
      nome_comercial,
      principio_ativo,
      concentracao,
      forma_farmaceutica,
      registro_anvisa,
      instrucoes_uso,
    } = req.body || {};

    await query(
      `UPDATE remedios SET
         nome_comercial = COALESCE(:nome_comercial, nome_comercial),
         principio_ativo = COALESCE(:principio_ativo, principio_ativo),
         concentracao = COALESCE(:concentracao, concentracao),
         forma_farmaceutica = COALESCE(:forma_farmaceutica, forma_farmaceutica),
         registro_anvisa = COALESCE(:registro_anvisa, registro_anvisa),
         instrucoes_uso = COALESCE(:instrucoes_uso, instrucoes_uso)
       WHERE id = :id`,
      {
        id,
        nome_comercial: nome_comercial ?? null,
        principio_ativo: principio_ativo ?? null,
        concentracao: concentracao ?? null,
        forma_farmaceutica: forma_farmaceutica ?? null,
        registro_anvisa: registro_anvisa ?? null,
        instrucoes_uso: instrucoes_uso ?? null,
      }
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'editar',
      recurso: 'remedios',
      recursoId: id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteRemedio(req, res, next) {
  try {
    const { id } = req.params;
    await query(`DELETE FROM remedios WHERE id = :id`, { id });
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'deletar',
      recurso: 'remedios',
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
  listRemedios,
  getRemedio,
  createRemedio,
  updateRemedio,
  deleteRemedio,
};
