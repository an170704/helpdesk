const AppError = require('../../utils/AppError');
const userService = require('./user.service');
const ticketService = require('../tickets/ticket.service');

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
  const { full_name, email, phone, address, role, password, group_ids } = req.body || {};

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

  validateContactFields(req.body || {});

  const user = await userService.create({
    fullName: full_name.trim(),
    email: email.trim(),
    phone: phone || null,
    address: address || null,
    role,
    password,
    groupIds: group_ids === undefined ? [] : group_ids,
  });

  res.status(201).json({ user });
}

function validateContactFields(body) {
  if (body.address !== undefined && body.address !== null && String(body.address).length > 255) {
    throw new AppError(400, 'address must not exceed 255 characters');
  }
}

async function getMe(req, res) {
  const [user, groups] = await Promise.all([
    userService.findById(req.user.id),
    userService.findGroupsForUser(req.user.id),
  ]);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  res.json({ user, groups });
}

async function updateMe(req, res) {
  const body = req.body || {};

  if (body.full_name !== undefined && !String(body.full_name).trim()) {
    throw new AppError(400, 'full_name cannot be empty');
  }
  if (body.phone !== undefined && body.phone !== null && String(body.phone).length > 20) {
    throw new AppError(400, 'phone must not exceed 20 characters');
  }
  validateContactFields(body);

  const user = await userService.update(req.user.id, body, undefined);
  res.json({ user });
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

  validateContactFields(body);

  if (Number(id) === req.user.id) {
    if (body.is_active === false) {
      throw new AppError(400, 'You cannot lock your own account');
    }
    if (body.role !== undefined && body.role !== req.user.role) {
      throw new AppError(400, 'You cannot change your own role');
    }
  }

  const user = await userService.update(id, body, body.group_ids);
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

async function getUserOverview(req, res) {
  const { id } = req.params;
  validateId(id);

  const user = await userService.findById(id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const [stats, groups, recentCreated, recentAssigned] = await Promise.all([
    userService.getTicketStats(id),
    userService.findGroupsForUser(id),
    ticketService.findRecent({ createdBy: id }),
    ticketService.findRecent({ assignedTo: id }),
  ]);

  res.json({ user, stats, groups, recentCreated, recentAssigned });
}

async function listTechnicians(req, res) {
  const technicians = await userService.findTechnicians();
  res.json({ technicians });
}

module.exports = { listUsers, getUser, getMe, updateMe, getUserOverview, createUser, updateUser, resetPassword, listTechnicians };
