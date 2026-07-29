const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_ROOT)) {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureUploadDir();
    cb(null, UPLOAD_ROOT);
  },
  filename(_req, file, cb) {
    const safe = String(file.originalname || 'arquivo')
      .replace(/[^\w.\-()+ ]+/g, '_')
      .slice(0, 80);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok =
      /^image\//.test(file.mimetype) ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!ok) {
      const err = new Error('Tipo de arquivo não permitido.');
      err.status = 400;
      return cb(err);
    }
    return cb(null, true);
  },
});

async function create(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Envie um arquivo no campo "file".',
      });
    }

    const relPath = `/uploads/${req.file.filename}`;
    const result = await query(
      `INSERT INTO arquivos
        (usuario_id, nome_original, mime_type, tamanho_bytes, caminho)
       VALUES
        (:usuario_id, :nome_original, :mime_type, :tamanho_bytes, :caminho)`,
      {
        usuario_id: req.user.id,
        nome_original: req.file.originalname,
        mime_type: req.file.mimetype,
        tamanho_bytes: req.file.size,
        caminho: relPath,
      }
    );

    await writeAudit({
      usuarioId: req.user.id,
      acao: 'upload',
      recurso: 'arquivos',
      recursoId: result.insertId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadados: {
        mime_type: req.file.mimetype,
        tamanho_bytes: req.file.size,
      },
    });

    return res.status(201).json({
      id: result.insertId,
      caminho: relPath,
      url: relPath,
      nome_original: req.file.originalname,
      mime_type: req.file.mimetype,
      tamanho_bytes: req.file.size,
    });
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const rows = await query(`SELECT * FROM arquivos WHERE id = :id LIMIT 1`, {
      id: req.params.id,
    });
    if (!rows[0]) {
      return res.status(404).json({ error: 'not_found', message: 'Arquivo não encontrado.' });
    }
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  upload,
  create,
  getById,
  UPLOAD_ROOT,
  ensureUploadDir,
};
