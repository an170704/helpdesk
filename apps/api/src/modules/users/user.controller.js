const AppError = require('../../utils/AppError');
const userService = require('./user.service');

const ROLES = ['user', 'technician', 'admin'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

function validateId(id) {
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }
}

async function listUsers(req, res) {
  const users = await userService.findAll({
    role: req.query.role,
    search: req.query.search,
  });
  res.json({ users });
}

async function getUser(req, res) {
  const { id } = req.params;
  validateId(id);

  const user = await userService.findById(id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  res.json({ user });
}

async function createUser(req, res) {
  const { full_name, email, phone, role, password } = req.body || {};

  if (!full_name || !full_name.trim()) {
    throw new AppError(400, 'full_name is required');
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new AppError(400, 'Invalid email');
  }
  if (!ROLES.includes(role)) {
    throw new AppError(400, 'Invalid role');
  }
  if (!password || password.length < MIN_PASSWORD) {
    throw new AppError(400, `Password must be at least ${MIN_PASSWORD} characters`);
  }

  const user = await userService.create({
    fullName: full_name.trim(),
    email: email.trim(),
    phone: phone || null,
    role,
    password,
  });

  res.status(201).json({ user });
}

async function updateUser(req, res) {
  const { id } = req.params;
  validateId(id);

  const body = req.body || {};

  if (body.full_name !== undefined && !String(body.full_name).trim()) {
    throw new AppError(400, 'full_name cannot be empty');
  }
  if (body.email !== undefined && !EMAIL_PATTERN.test(String(body.email))) {
    throw new AppError(400, 'Invalid email');
  }
  if (body.role !== undefined && !ROLES.includes(body.role)) {
    throw new AppError(400, 'Invalid role');
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    throw new AppError(400, 'is_active must be a boolean');
  }
  if (body.phone !== undefined && body.phone !== null && String(body.phone).length > 20) {
    throw new AppError(400, 'phone must not exceed 20 characters');
  }

  if (Number(id) === req.user.id) {
    if (body.is_active === false) {
      throw new AppError(400, 'You cannot lock your own account');
    }
    if (body.role !== undefined && body.role !== req.user.role) {
      throw new AppError(400, 'You cannot change your own role');
    }
  }

  const user = await userService.update(id, body);
  res.json({ user });
}

async function resetPassword(req, res) {
  const { id } = req.params;
  validateId(id);

  const { password } = req.body || {};
  if (!password || password.length < MIN_PASSWORD) {
    throw new AppError(400, `Password must be at least ${MIN_PASSWORD} characters`);
  }

  await userService.resetPassword(id, password);
  res.json({ message: 'Password reset' });
}

async function listTechnicians(req, res) {
  const technicians = await userService.findTechnicians();
  res.json({ technicians });
}

module.exports = { listUsers, getUser, createUser, updateUser, resetPassword, listTechnicians };
