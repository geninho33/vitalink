const authService = require('../services/auth.service');
const { getMenusByPerfil } = require('../services/menu.service');

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
    return res.json({ menus });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, menusMe };
