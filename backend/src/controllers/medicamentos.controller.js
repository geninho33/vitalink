const { query, isDuplicateKey } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const {
  applyPacienteScope,
  assertPacienteAccess,
  farmaciasScopeForCrud,
} = require('../services/pacienteScope.service');
const {
  syncRemedioAgenda,
  daysRemaining,
  consumoDiario,
  clearFutureDoses,
} = require('../services/medicamentoAgenda.service');
const { parseIsoDate, validationError } = require('../utils/validation');

function parseMoney(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value).replace(/R\$\s?/gi, '').trim();
  const n = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
  return Number.isFinite(n) ? n : null;
}

function enrich(row) {
  const daily = consumoDiario(row);
  const days = daysRemaining(row);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + Math.max(0, days - 1));
  const alert = new Date(end);
  alert.setDate(alert.getDate() - 3);
  return {
    ...row,
    consumo_diario: daily,
    dias_restantes: days,
    data_fim_estoque: end.toISOString().slice(0, 10),
    data_alerta_reposicao: alert.toISOString().slice(0, 10),
    alerta_reposicao: days > 0 && days <= 3,
  };
}

async function list(req, res, next) {
  try {
    const pacienteId = Number(req.query.paciente_id);
    if (!pacienteId) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe o paciente para listar os medicamentos.',
      });
    }
    await assertPacienteAccess(req.user, pacienteId);

    const where = ['r.paciente_id = :pacienteId'];
    const params = { pacienteId };
    const scope = await applyPacienteScope(req.user, 'r.paciente_id');
    if (scope?.sql) {
      where.push(`(${scope.sql})`);
      Object.assign(params, scope.params);
    }

    const rows = await query(
      `SELECT r.*, f.nome_fantasia AS farmacia_nome
       FROM remedios r
       LEFT JOIN farmacias f ON f.id = r.farmacia_id
       WHERE ${where.join(' AND ')}
       ORDER BY r.nome_comercial ASC, r.id DESC`,
      params
    );
    return res.json({ data: rows.map(enrich) });
  } catch (err) {
    return next(err);
  }
}

async function listFarmacias(req, res, next) {
  try {
    const where = [`farmacias.status = 'ativo'`];
    const params = {};
    const q = String(req.query.q || '').trim();
    const limit = Math.min(20, Math.max(1, Number(req.query.pageSize) || 20));
    const scope = await farmaciasScopeForCrud(req);
    if (scope?.sql) {
      where.push(`(${scope.sql})`);
      Object.assign(params, scope.params);
    }
    if (q) {
      where.push(
        `(farmacias.nome_fantasia ILIKE :q OR farmacias.bairro ILIKE :q OR farmacias.cidade ILIKE :q OR farmacias.uf ILIKE :q)`
      );
      params.q = `%${q}%`;
    }
    params.lim = limit;
    const rows = await query(
      `SELECT id, nome_fantasia, telefone_principal, bairro, cidade, uf, logradouro
       FROM farmacias
       WHERE ${where.join(' AND ')}
       ORDER BY nome_fantasia ASC
       LIMIT :lim`,
      params
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
}

async function farmaciaRapida(req, res, next) {
  try {
    const nome = String(req.body?.nome_fantasia || req.body?.nome || '').trim();
    const telefone = String(req.body?.telefone_principal || req.body?.telefone || '00000000000').trim();
    if (!nome) validationError('Informe o nome da farmácia.');

    const result = await query(
      `INSERT INTO farmacias
        (nome_fantasia, telefone_principal, cep, logradouro, numero, bairro, cidade, uf, status, usuario_id)
       VALUES
        (:nome, :telefone, '00000000', 'A definir', 's/n', 'A definir', 'A definir', 'SP', 'ativo', :usuario_id)`,
      { nome, telefone, usuario_id: req.user.id }
    );
    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'farmacias',
      recursoId: result.insertId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(201).json({
      id: result.insertId,
      nome_fantasia: nome,
      telefone_principal: telefone,
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      err.status = 409;
      err.message = 'Farmácia já cadastrada.';
    }
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const b = req.body || {};
    const pacienteId = Number(b.paciente_id);
    if (!pacienteId) validationError('Informe o paciente.');
    await assertPacienteAccess(req.user, pacienteId);

    const nome = String(b.nome_comercial || b.nome || '').trim();
    const valor = parseMoney(b.valor);
    const farmaciaId = Number(b.farmacia_id);
    if (!nome) validationError('Informe o nome do medicamento.');
    if (!farmaciaId) validationError('Selecione a farmácia.');
    if (valor == null || valor < 0) validationError('Informe o valor do medicamento no formato R$ 0,00.');

    const estoque = Number(b.quantidade_estoque);
    if (!Number.isFinite(estoque) || estoque < 0) {
      validationError('Informe a quantidade em estoque.');
    }

    const result = await query(
      `INSERT INTO remedios
        (nome_comercial, principio_ativo, quantidade_administrar, quantidade_estoque,
         indicacao, laboratorio, periodo_horario, hora_exata, uso_continuo, status,
         farmacia_id, valor, paciente_id, consumo_diario, medico_prescritor_id,
         instrucoes_uso, intervalo_horas)
       VALUES
        (:nome, :principio, :dose, :estoque, :indicacao, :laboratorio, :periodo, :hora,
         :continuo, 'ativo', :farmaciaId, :valor, :pacienteId, :consumo, :medico,
         :instrucoes, :intervalo)`,
      {
        nome,
        principio: String(b.principio_ativo || nome).trim(),
        dose: String(b.quantidade_administrar || b.dosagem || '').trim() || '1',
        estoque,
        indicacao: String(b.indicacao || b.purpose || 'Uso conforme prescrição').trim(),
        laboratorio: b.laboratorio || null,
        periodo: b.periodo_horario || 'manha',
        hora: b.hora_exata || null,
        continuo: b.uso_continuo === true || b.uso_continuo === 'true',
        farmaciaId,
        valor,
        pacienteId,
        consumo: Number(b.consumo_diario) > 0 ? Number(b.consumo_diario) : null,
        medico: b.medico_prescritor_id || null,
        instrucoes: b.instrucoes_uso || null,
        intervalo: Number(b.intervalo_horas) > 0 ? Number(b.intervalo_horas) : null,
      }
    );

    const rows = await query(`SELECT * FROM remedios WHERE id = :id LIMIT 1`, {
      id: result.insertId,
    });
    await query(
      `INSERT INTO medicamento_compras
        (remedio_id, paciente_id, farmacia_id, quantidade, valor, data_compra, usuario_id)
       VALUES
        (:remedioId, :pacienteId, :farmaciaId, :quantidade, :valor, COALESCE(:dataCompra, CURRENT_DATE), :usuarioId)`,
      {
        remedioId: result.insertId,
        pacienteId,
        farmaciaId,
        quantidade: estoque,
        valor,
        dataCompra: parseIsoDate(b.data_compra) || null,
        usuarioId: req.user.id,
      }
    );
    await syncRemedioAgenda(rows[0], {
      pacienteId,
      fromDate: parseIsoDate(b.data_compra),
    });

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'remedios',
      recursoId: result.insertId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({ id: result.insertId, data: enrich(rows[0]) });
  } catch (err) {
    if (isDuplicateKey(err)) {
      err.status = 409;
      err.message = 'Medicamento duplicado.';
    }
    return next(err);
  }
}

async function listCompras(req, res, next) {
  try {
    const remedioId = Number(req.params.id);
    const rows = await query(`SELECT paciente_id FROM remedios WHERE id = :id LIMIT 1`, {
      id: remedioId,
    });
    if (!rows[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Medicamento não encontrado.' });
    }
    if (rows[0].paciente_id) await assertPacienteAccess(req.user, rows[0].paciente_id);

    const compras = await query(
      `SELECT c.*, f.nome_fantasia AS farmacia_nome
       FROM medicamento_compras c
       LEFT JOIN farmacias f ON f.id = c.farmacia_id
       WHERE c.remedio_id = :remedioId
       ORDER BY c.data_compra DESC, c.id DESC`,
      { remedioId }
    );
    return res.json({ data: compras });
  } catch (err) {
    return next(err);
  }
}

async function createCompra(req, res, next) {
  try {
    const remedioId = Number(req.params.id);
    const b = req.body || {};
    const existing = await query(`SELECT * FROM remedios WHERE id = :id LIMIT 1`, {
      id: remedioId,
    });
    if (!existing[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Medicamento não encontrado.' });
    }
    const remedio = existing[0];
    if (remedio.paciente_id) await assertPacienteAccess(req.user, remedio.paciente_id);

    const quantidade = Number(b.quantidade);
    const valor = parseMoney(b.valor);
    const dataCompra = parseIsoDate(b.data_compra);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      validationError('Informe a quantidade adquirida.');
    }
    if (valor == null || valor < 0) validationError('Informe o valor da compra.');
    if (!dataCompra) validationError('Informe a data da compra no formato DD/MM/AAAA.');

    await query(
      `INSERT INTO medicamento_compras
        (remedio_id, paciente_id, farmacia_id, quantidade, valor, data_compra, usuario_id)
       VALUES
        (:remedioId, :pacienteId, :farmaciaId, :quantidade, :valor, :dataCompra, :usuarioId)`,
      {
        remedioId,
        pacienteId: remedio.paciente_id,
        farmaciaId: b.farmacia_id || remedio.farmacia_id,
        quantidade,
        valor,
        dataCompra,
        usuarioId: req.user.id,
      }
    );

    await query(
      `UPDATE remedios SET
         quantidade_estoque = COALESCE(quantidade_estoque, 0) + :quantidade,
         valor = :valor,
         farmacia_id = COALESCE(:farmaciaId, farmacia_id)
       WHERE id = :id`,
      {
        id: remedioId,
        quantidade,
        valor,
        farmaciaId: b.farmacia_id || remedio.farmacia_id,
      }
    );

    const updated = await query(`SELECT * FROM remedios WHERE id = :id LIMIT 1`, {
      id: remedioId,
    });
    await syncRemedioAgenda(updated[0], {
      pacienteId: remedio.paciente_id,
      fromDate: dataCompra,
    });

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'criar',
      recurso: 'medicamento_compras',
      recursoId: remedioId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({ ok: true, data: enrich(updated[0]) });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT paciente_id FROM remedios WHERE id = :id LIMIT 1`, { id });
    if (!rows[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Medicamento não encontrado.' });
    }
    if (rows[0].paciente_id) await assertPacienteAccess(req.user, rows[0].paciente_id);
    await clearFutureDoses(id);
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
  list,
  listFarmacias,
  farmaciaRapida,
  create,
  listCompras,
  createCompra,
  remove,
};
