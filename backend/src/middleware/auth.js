const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { resolvePapel } = require('../services/papel.service');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Token Bearer ausente ou inválido.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: 'unauthorized',
        message: expired ? 'Sessão expirada. Faça login novamente.' : 'Token inválido.',
      });
    }

    const userId = Number(decoded.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Token inválido (sujeito ausente).',
      });
    }

    let rows;
    try {
      rows = await query(
        `SELECT u.id, u.nome, u.email, u.status, u.perfil_id, p.nome AS perfil_nome,
                COALESCE(u.onboarding_concluido, TRUE) AS onboarding_concluido
         FROM usuarios u
         INNER JOIN perfis p ON p.id = u.perfil_id
         WHERE u.id = :id
         LIMIT 1`,
        { id: userId }
      );
    } catch (dbErr) {
      logger.error('Falha ao validar usuário autenticado', {
        message: dbErr.message,
        code: dbErr.code,
      });
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Falha temporária ao validar a sessão. Tente novamente.',
      });
    }

    const user = rows[0];
    if (!user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Usuário do token não encontrado.',
      });
    }

    if (String(user.status).toLowerCase() !== 'ativo') {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Usuário inválido ou inativo.',
      });
    }

    // Contexto ativo: JWT (Profile Switch) com fallback ao perfil legado
    let perfilId = Number(decoded.perfilId) || Number(user.perfil_id);
    let perfilNome = user.perfil_nome;
    let pacienteId =
      decoded.pacienteId != null && decoded.pacienteId !== ''
        ? Number(decoded.pacienteId)
        : null;
    let papelId =
      decoded.papelId != null && decoded.papelId !== ''
        ? Number(decoded.papelId)
        : null;

    try {
      const papel = await resolvePapel(userId, {
        papelId,
        perfilId,
        pacienteId,
      });
      if (papel) {
        perfilId = papel.perfil_id;
        perfilNome = papel.perfil_nome;
        pacienteId = papel.paciente_id;
        papelId = papel.id;
      } else {
        // Confirma nome do perfil do token
        const pRows = await query(
          `SELECT nome FROM perfis WHERE id = :id LIMIT 1`,
          { id: perfilId }
        );
        if (pRows[0]) perfilNome = pRows[0].nome;
      }
    } catch (err) {
      logger.warn('Falha ao resolver papel ativo', { message: err.message });
    }

    req.user = {
      id: Number(user.id),
      nome: user.nome,
      email: user.email,
      perfilId: Number(perfilId),
      perfilNome,
      pacienteId: pacienteId != null && Number.isFinite(pacienteId) ? pacienteId : null,
      papelId: papelId != null && Number.isFinite(papelId) ? papelId : null,
      onboardingConcluido: user.onboarding_concluido !== false && user.onboarding_concluido !== 0,
    };
    req.auth = { token, decoded };
    return next();
  } catch (err) {
    logger.error('Erro inesperado no authenticate', { message: err.message });
    return res.status(500).json({
      error: 'internal_error',
      message: 'Erro ao autenticar a requisição.',
    });
  }
}

module.exports = { authenticate };
