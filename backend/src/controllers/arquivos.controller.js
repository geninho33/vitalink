const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { query } = require('../config/database');
const { writeAudit } = require('../services/audit.service');
const { assertPacienteAccess } = require('../services/pacienteScope.service');

// Validação de path: deve ser dentro de UPLOAD_ROOT
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const RESOLVED_UPLOAD_ROOT = path.resolve(UPLOAD_ROOT);

// Validar UPLOAD_DIR em produção
if (process.env.NODE_ENV === 'production' && !RESOLVED_UPLOAD_ROOT.includes('/app/uploads')) {
  throw new Error(
    'UPLOAD_DIR inválido em produção. Deve estar dentro de /app/uploads. ' +
    `Valor atual: ${RESOLVED_UPLOAD_ROOT}`
  );
}

function ensureUploadDir() {
  if (!fs.existsSync(RESOLVED_UPLOAD_ROOT)) {
    fs.mkdirSync(RESOLVED_UPLOAD_ROOT, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureUploadDir();
    cb(null, RESOLVED_UPLOAD_ROOT);
  },
  filename(_req, file, cb) {
    // Sanitização de nome: remove caracteres perigosos e limita tamanho
    const safe = String(file.originalname || 'arquivo')
      .replace(/[^\w.\-()+ ]+/g, '_')
      .replace(/\.\./g, '_') // Remove .. (path traversal)
      .slice(0, 80) || 'arquivo';
    
    // Prefixo com timestamp e random para evitar colisões e sobrescrita
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    cb(null, `${timestamp}-${random}-${safe}`);
  },
});

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// Magic bytes para validação de tipo real do arquivo
const MAGIC_BYTES = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP tem mais validação depois)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  // DOC/DOCX são ZIP-based, mais complexos de validar por magic bytes
};

/**
 * Valida o tipo real do arquivo lendo os primeiros bytes (magic bytes).
 * Previne upload de executáveis ou scripts mascarados com extensão de imagem.
 */
async function validateFileType(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: 11 });
    const chunks = [];
    
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      
      // Verificar magic bytes conhecidos
      for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
        for (const sig of signatures) {
          let match = true;
          for (let i = 0; i < sig.length; i++) {
            if (buffer[i] !== sig[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            return resolve(mimeType);
          }
        }
      }
      
      // Se não reconhecer, rejeitar por segurança
      resolve(null);
    });
    stream.on('error', reject);
  });
}

function isAllowedUpload(file) {
  const mime = String(file.mimetype || '').toLowerCase();
  const name = String(file.originalname || '').toLowerCase();
  
  // Aceitar apenas tipos explicitamente permitidos
  if (ALLOWED_MIME.has(mime) || /^image\/(jpeg|png|gif|webp)$/.test(mime)) {
    return true;
  }
  
  // Fallback para câmeras mobile que não enviam MIME correto
  // Será validado por magic bytes depois
  if (!mime || mime === 'application/octet-stream') {
    return /\.(jpe?g|png|gif|webp|pdf)$/i.test(name);
  }
  
  return false;
}

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!isAllowedUpload(file)) {
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

    const filePath = path.join(RESOLVED_UPLOAD_ROOT, req.file.filename);
    
    // Validar magic bytes para garantir que o tipo real corresponde ao esperado
    const realMimeType = await validateFileType(filePath);
    
    if (!realMimeType || !ALLOWED_MIME.has(realMimeType)) {
      // Deletar arquivo inválido
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'validation_error',
        message: 'Tipo de arquivo não permitido ou arquivo corrompido. Tipos aceitos: imagens (JPEG, PNG, GIF, WebP) e PDF.',
      });
    }

    const relPath = `/uploads/${req.file.filename}`;
    const pacienteId = req.body.paciente_id || req.query.paciente_id || null;
    
    // Se vinculado a paciente, verificar acesso
    if (pacienteId) {
      await assertPacienteAccess(req.user, pacienteId);
    }
    
    const result = await query(
      `INSERT INTO arquivos
        (usuario_id, paciente_id, nome_original, mime_type, tamanho_bytes, caminho)
       VALUES
        (:usuario_id, :paciente_id, :nome_original, :mime_type, :tamanho_bytes, :caminho)`,
      {
        usuario_id: req.user.id,
        paciente_id: pacienteId,
        nome_original: req.file.originalname,
        mime_type: realMimeType, // Usar tipo real detectado por magic bytes
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
        mime_type: realMimeType,
        tamanho_bytes: req.file.size,
        paciente_id: pacienteId,
      },
    });

    return res.status(201).json({
      id: result.insertId,
      caminho: relPath,
      url: relPath,
      nome_original: req.file.originalname,
      mime_type: realMimeType,
      tamanho_bytes: req.file.size,
    });
  } catch (err) {
    // Limpar arquivo em caso de erro
    if (req.file && req.file.filename) {
      const filePath = path.join(RESOLVED_UPLOAD_ROOT, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
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

/**
 * Serve arquivo com autenticação e verificação de escopo.
 * Substitui express.static('/uploads') que expunha arquivos publicamente.
 */
async function serveFile(req, res, next) {
  try {
    const filename = req.params.filename;
    
    // Prevenir path traversal: validar que filename não contém ../ ou /
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        error: 'invalid_filename',
        message: 'Nome de arquivo inválido.',
      });
    }
    
    // Buscar arquivo no banco para verificar escopo
    const rows = await query(
      `SELECT a.*, p.id AS paciente_id
       FROM arquivos a
       LEFT JOIN exames_receitas er ON er.arquivo_id = a.id
       LEFT JOIN pacientes p ON p.id = COALESCE(a.paciente_id, er.paciente_id)
       WHERE a.caminho = :caminho
       LIMIT 1`,
      { caminho: `/uploads/${filename}` }
    );
    
    if (!rows[0]) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Arquivo não encontrado.',
      });
    }
    
    const arquivo = rows[0];
    
    // Verificar escopo: se arquivo está vinculado a paciente, verificar acesso
    if (arquivo.paciente_id) {
      await assertPacienteAccess(req.user, arquivo.paciente_id);
    } else {
      // Se não está vinculado a paciente, apenas o dono pode acessar
      // (exceto admin/médico/atendente que têm acesso irrestrito via assertPacienteAccess)
      const perfilId = Number(req.user.perfilId);
      const isUnrestricted = [1, 2, 3].includes(perfilId); // Admin, Médico, Atendente
      
      if (!isUnrestricted && arquivo.usuario_id !== req.user.id) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Você não tem permissão para acessar este arquivo.',
        });
      }
    }
    
    // Servir arquivo
    const fullPath = path.join(RESOLVED_UPLOAD_ROOT, filename);
    
    // Validar que o path resolvido está dentro de UPLOAD_ROOT (segurança adicional)
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(RESOLVED_UPLOAD_ROOT)) {
      return res.status(400).json({
        error: 'invalid_path',
        message: 'Caminho de arquivo inválido.',
      });
    }
    
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Arquivo não encontrado no sistema de arquivos.',
      });
    }
    
    // Configurar headers de segurança para download/visualização
    res.setHeader('Content-Type', arquivo.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', arquivo.tamanho_bytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Para PDFs e imagens, permitir visualização inline; para outros, forçar download
    if (/^(image\/|application\/pdf)/.test(arquivo.mime_type)) {
      res.setHeader('Content-Disposition', `inline; filename="${arquivo.nome_original}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${arquivo.nome_original}"`);
    }
    
    return res.sendFile(resolvedPath);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  upload,
  create,
  getById,
  serveFile,
  UPLOAD_ROOT: RESOLVED_UPLOAD_ROOT,
  ensureUploadDir,
};
