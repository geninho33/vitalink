const authService = require('../services/auth.service');
const { getMenusByPerfil } = require('../services/menu.service');
const { listPapeisByUsuario } = require('../services/papel.service');

async function login(req, res, next) {
  try {
    const { email, senha, password } = req.body || {};
    const plain = senha || password;

    if (!email || !plain) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe e-mail e senha.',
      });
    }

    const result = await authService.login({
      email,
      senha: plain,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function menusMe(req, res, next) {
  try {
    const menus = await getMenusByPerfil(req.user.perfilId);
    const papeis = await listPapeisByUsuario(req.user.id);
    const ativo =
      papeis.find((p) => p.id != null && Number(p.id) === Number(req.user.papelId)) ||
      papeis.find(
        (p) =>
          Number(p.perfil_id) === Number(req.user.perfilId) &&
          (req.user.pacienteId == null
            ? p.paciente_id == null
            : Number(p.paciente_id) === Number(req.user.pacienteId))
      );

    return res.json({
      menus,
      papeis,
      usuario: {
        id: req.user.id,
        nome: req.user.nome,
        email: req.user.email,
        telefone: req.user.telefone || '',
        cpf: req.user.cpf || '',
        data_nascimento: req.user.dataNascimento || null,
        perfil: {
          id: req.user.perfilId,
          nome: ativo?.perfil_nome || req.user.perfilNome,
        },
        paciente_ativo_id: req.user.pacienteId || null,
        onboarding_concluido: req.user.onboardingConcluido !== false,
        papel_ativo: {
          id: ativo?.id ?? req.user.papelId,
          perfil_id: req.user.perfilId,
          paciente_id: req.user.pacienteId || null,
          rotulo: ativo?.rotulo || req.user.perfilNome,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function listPapeis(req, res, next) {
  try {
    const papeis = await listPapeisByUsuario(req.user.id);
    return res.json({ data: papeis });
  } catch (err) {
    return next(err);
  }
}

async function switchContext(req, res, next) {
  try {
    const { papel_id, perfil_id, paciente_id } = req.body || {};
    if (papel_id == null && perfil_id == null) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Informe papel_id ou perfil_id.',
      });
    }

    const result = await authService.switchContext({
      usuarioId: req.user.id,
      papelId: papel_id,
      perfilId: perfil_id,
      pacienteId: paciente_id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, menusMe, listPapeis, switchContext };
