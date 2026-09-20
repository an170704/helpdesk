const AppError = require('../../utils/AppError');
const authService = require('./auth.service');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }

  const result = await authService.login(email.trim().toLowerCase(), password);
  res.json(result);
}

async function me(req, res) {
  const user = await authService.getProfile(req.user.id);
  res.json({ user });
}

module.exports = { login, me };
