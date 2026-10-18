const AppError = require('../../utils/AppError');
const businessHours = require('../../utils/businessHours');
const groupService = require('./group.service');

function validateId(id) {
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }
}

function validateName(name) {
  const value = (name || '').trim();
  if (!value) {
    throw new AppError(400, 'name is required');
  }
  if (value.length > 100) {
    throw new AppError(400, 'name must not exceed 100 characters');
  }
  return value;
}

async function listGroups(req, res) {
  const groups = await groupService.findAll();
  res.json({ groups });
}

async function listGroupOptions(req, res) {
  const groups = await groupService.findOptions();
  res.json({ groups });
}

async function getGroup(req, res) {
  const { id } = req.params;
  validateId(id);

  const group = await groupService.findOne(id);
  if (!group) {
    throw new AppError(404, 'Group not found');
  }
  res.json({ group });
}

async function createGroup(req, res) {
  const name = validateName(req.body && req.body.name);
  const description = req.body && req.body.description ? String(req.body.description).trim() : null;

  const group = await groupService.create({ name, description });
  res.status(201).json({ group });
}

async function updateGroup(req, res) {
  const { id } = req.params;
  validateId(id);

  const name = validateName(req.body && req.body.name);
  const description = req.body && req.body.description ? String(req.body.description).trim() : null;

  const group = await groupService.update(id, { name, description });
  res.json({ group });
}

async function deleteGroup(req, res) {
  const { id } = req.params;
  validateId(id);

  await groupService.remove(id);
  res.status(204).end();
}

async function setMembers(req, res) {
  const { id } = req.params;
  validateId(id);

  const userIds = (req.body && req.body.user_ids) || [];
  await groupService.setMembers(id, userIds);
  res.json({ message: 'Members updated' });
}

async function addMembers(req, res) {
  const { id } = req.params;
  validateId(id);

  const emails = (req.body && req.body.emails) || [];
  const result = await groupService.addMembersByEmail(id, emails);
  res.json(result);
}

async function removeMember(req, res) {
  const { id, userId } = req.params;
  validateId(id);
  validateId(userId);

  await groupService.removeMember(id, userId);
  res.status(204).end();
}

const ASSIGNMENT_MODES = ['manual', 'round_robin', 'load_based'];

async function setAssignmentMode(req, res) {
  const { id } = req.params;
  validateId(id);

  const mode = req.body && req.body.assignment_mode;
  if (!ASSIGNMENT_MODES.includes(mode)) {
    throw new AppError(400, `assignment_mode must be one of: ${ASSIGNMENT_MODES.join(', ')}`);
  }

  const saved = await groupService.setAssignmentMode(id, mode);
  res.json({ assignment_mode: saved });
}

async function setBusinessHours(req, res) {
  const { id } = req.params;
  validateId(id);

  const schedule = req.body ? req.body.business_hours : undefined;

  // null = clear the custom schedule and fall back to the workspace default
  if (schedule === null) {
    await groupService.setBusinessHours(id, null);
    return res.json({ business_hours: null });
  }

  const validated = businessHours.validateBusinessHours(schedule);
  const saved = await groupService.setBusinessHours(id, validated);

  res.json({ business_hours: saved });
}

module.exports = {
  listGroups,
  listGroupOptions,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  setMembers,
  addMembers,
  removeMember,
  setAssignmentMode,
  setBusinessHours,
};
