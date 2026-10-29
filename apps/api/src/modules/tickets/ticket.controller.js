const AppError = require('../../utils/AppError');
const ticketService = require('./ticket.service');
const assignmentService = require('./assignment.service');
const { assertCanView, isInGroup } = require('./ticket.access');
const feedbackService = require('../feedback/feedback.service');
const userService = require('../users/user.service');
const groupService = require('../groups/group.service');
const categoryService = require('../categories/category.service');
const { TICKET_STATUSES, TICKET_PRIORITIES } = require('./ticket.constants');

function validateId(id) {
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }
}

async function findTicketOrFail(id) {
  const ticket = await ticketService.findById(id);
  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }
  return ticket;
}

async function createTicket(req, res) {
  const subject = (req.body.subject || '').trim();
  const description = String(req.body.description || '').trim();
  const descriptionText = description.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();

  if (!subject || !descriptionText) {
    throw new AppError(400, 'subject and description are required');
  }
  if (subject.length > 255) {
    throw new AppError(400, 'subject must not exceed 255 characters');
  }
  if (description.length > 20000) {
    throw new AppError(400, 'description is too long');
  }

  const priority = req.body.priority || 'medium';
  if (!TICKET_PRIORITIES.includes(priority)) {
    throw new AppError(400, 'Invalid priority');
  }

  // Admins may create tickets on behalf of another member
  let createdBy = req.user.id;
  if (req.body.created_by != null) {
    if (req.user.role !== 'admin') {
      throw new AppError(403, 'Only admins can create tickets for other users');
    }
    const value = String(req.body.created_by);
    if (!/^\d+$/.test(value)) {
      throw new AppError(400, 'Invalid created_by');
    }
    const requester = await userService.findById(value);
    if (!requester) {
      throw new AppError(404, 'Requester not found');
    }
    createdBy = requester.id;
  }

  const status = req.body.status || 'pending';
  if (!TICKET_STATUSES.includes(status)) {
    throw new AppError(400, 'Invalid status');
  }

  let assignedTo = null;
  if (req.body.assigned_to != null && req.body.assigned_to !== '') {
    if (req.user.role !== 'admin') {
      throw new AppError(403, 'Only admins can assign tickets on creation');
    }
    const value = String(req.body.assigned_to);
    if (!/^\d+$/.test(value)) {
      throw new AppError(400, 'Invalid assigned_to');
    }
    const technician = await userService.findById(value);
    if (!technician) {
      throw new AppError(404, 'Technician not found');
    }
    if (technician.role !== 'technician') {
      throw new AppError(400, 'assigned_to must be a technician');
    }
    assignedTo = technician.id;
  }

  let groupId = null;
  if (req.body.group_id != null && req.body.group_id !== '') {
    const value = String(req.body.group_id);
    if (!/^\d+$/.test(value)) {
      throw new AppError(400, 'Invalid group_id');
    }
    const group = await groupService.findById(value);
    if (!group) {
      throw new AppError(404, 'Group not found');
    }
    groupId = group.id;
  }

  let categoryId = null;
  if (req.body.category_id != null && req.body.category_id !== '') {
    const value = String(req.body.category_id);
    if (!/^\d+$/.test(value)) {
      throw new AppError(400, 'Invalid category_id');
    }
    const category = await categoryService.findById(value);
    if (!category) {
      throw new AppError(404, 'Category not found');
    }
    categoryId = category.id;
    if (groupId == null && category.group_id != null) {
      groupId = category.group_id;
    }
  }

  let ticket = await ticketService.create({
    subject,
    description,
    priority,
    status,
    assignedTo,
    groupId,
    categoryId,
    createdBy,
    actorId: req.user.id,
  });

  // Route to an agent automatically when the target group uses round-robin / load-based
  ticket = await assignmentService.autoAssignTicket(ticket.id);

  res.status(201).json({ ticket });
}

async function listTickets(req, res) {
  const { role, id } = req.user;

  let tickets;
  if (role === 'admin') {
    tickets = await ticketService.findAll();
  } else if (role === 'technician') {
    tickets = await ticketService.findAllForTechnician(id);
  } else {
    tickets = await ticketService.findAllByUser(id);
  }

  res.json({ tickets });
}

async function getTicket(req, res) {
  const { id } = req.params;
  validateId(id);

  const ticket = await findTicketOrFail(id);
  await assertCanView(ticket, req.user);

  const [attachments, feedback] = await Promise.all([
    ticketService.findAttachments(id),
    feedbackService.findByTicket(id),
  ]);
  res.json({ ticket: { ...ticket, attachments, feedback } });
}

async function updateStatus(req, res) {
  const { id } = req.params;
  validateId(id);

  const { status, note } = req.body;
  if (!TICKET_STATUSES.includes(status)) {
    throw new AppError(400, 'Invalid status');
  }

  if (req.user.role === 'technician') {
    const ticket = await findTicketOrFail(id);
    const isAssignee = ticket.assigned_to === req.user.id;
    const canTakeFromGroup =
      !ticket.assigned_to &&
      ticket.group_id &&
      (await isInGroup(req.user.id, ticket.group_id));

    if (!isAssignee && !canTakeFromGroup) {
      throw new AppError(403, 'You can only update tickets assigned to you or your groups');
    }
  }

  const ticket = await ticketService.updateStatus({
    ticketId: id,
    actorId: req.user.id,
    actorRole: req.user.role,
    status,
    note,
  });

  res.json({ ticket });
}

async function saveResolution(req, res) {
  const { id } = req.params;
  validateId(id);

  const { resolution, bot_usable } = req.body || {};
  if (resolution !== undefined && resolution !== null && typeof resolution !== 'string') {
    throw new AppError(400, 'resolution must be a string');
  }
  if (typeof resolution === 'string' && resolution.length > 5000) {
    throw new AppError(400, 'Resolution must not exceed 5000 characters');
  }
  if (bot_usable !== undefined && typeof bot_usable !== 'boolean') {
    throw new AppError(400, 'bot_usable must be a boolean');
  }

  const ticket = await ticketService.saveResolution({
    ticketId: id,
    actorId: req.user.id,
    actorRole: req.user.role,
    resolution: typeof resolution === 'string' ? resolution : null,
    botUsable: bot_usable === true,
  });

  res.json({ ticket });
}

async function updatePriority(req, res) {
  const { id } = req.params;
  validateId(id);

  const { priority } = req.body;
  if (!TICKET_PRIORITIES.includes(priority)) {
    throw new AppError(400, 'Invalid priority');
  }

  const ticket = await ticketService.updatePriority({
    ticketId: id,
    actorId: req.user.id,
    priority,
  });

  res.json({ ticket });
}

async function updateCategory(req, res) {
  const { id } = req.params;
  validateId(id);

  const body = req.body || {};
  if (!Object.prototype.hasOwnProperty.call(body, 'category_id')) {
    throw new AppError(400, 'Provide category_id (or null to clear)');
  }

  const raw = body.category_id;
  if (raw != null && !/^\d+$/.test(String(raw))) {
    throw new AppError(400, 'Invalid category_id');
  }

  const ticket = await ticketService.updateCategory({
    ticketId: id,
    actorId: req.user.id,
    categoryId: raw == null ? null : Number(raw),
  });

  res.json({ ticket });
}

async function assignTicket(req, res) {
  const { id } = req.params;
  validateId(id);

  const body = req.body || {};
  const hasAssignedTo = Object.prototype.hasOwnProperty.call(body, 'assigned_to');
  const hasGroupId = Object.prototype.hasOwnProperty.call(body, 'group_id');

  if (!hasAssignedTo && !hasGroupId) {
    throw new AppError(400, 'Provide assigned_to or group_id (or null to clear)');
  }

  const assignedTo = hasAssignedTo ? body.assigned_to : undefined;
  const groupId = hasGroupId ? body.group_id : undefined;

  for (const [key, value] of [['assigned_to', assignedTo], ['group_id', groupId]]) {
    if (value != null && !/^\d+$/.test(String(value))) {
      throw new AppError(400, `Invalid ${key}`);
    }
  }

  let ticket = await ticketService.assignTicket({
    ticketId: id,
    actorId: req.user.id,
    assignedTo,
    groupId,
  });

  // Moving a ticket into an auto-routing group assigns an agent right away
  if (hasGroupId && !hasAssignedTo && ticket.group_id && !ticket.assigned_to) {
    ticket = await assignmentService.autoAssignTicket(id, { actorId: req.user.id });
  }

  res.json({ ticket });
}

async function autoAssignTicket(req, res) {
  const { id } = req.params;
  validateId(id);

  const ticket = await assignmentService.autoAssignTicket(id, { actorId: req.user.id });
  res.json({ ticket });
}

async function deleteTicket(req, res) {
  const { id } = req.params;
  validateId(id);

  await ticketService.deleteTicket(id);
  res.status(204).end();
}

async function listHistory(req, res) {
  const { id } = req.params;
  validateId(id);

  const ticket = await findTicketOrFail(id);
  await assertCanView(ticket, req.user);

  const history = await ticketService.findHistory(id);
  res.json({ history });
}

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateStatus,
  saveResolution,
  updatePriority,
  updateCategory,
  assignTicket,
  autoAssignTicket,
  deleteTicket,
  listHistory,
};
