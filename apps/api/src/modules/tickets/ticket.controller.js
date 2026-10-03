const AppError = require('../../utils/AppError');
const ticketService = require('./ticket.service');
const { assertCanView } = require('./ticket.access');
const feedbackService = require('../feedback/feedback.service');
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
  const description = (req.body.description || '').trim();

  if (!subject || !description) {
    throw new AppError(400, 'subject and description are required');
  }
  if (subject.length > 255) {
    throw new AppError(400, 'subject must not exceed 255 characters');
  }

  const priority = req.body.priority || 'medium';
  if (!TICKET_PRIORITIES.includes(priority)) {
    throw new AppError(400, 'Invalid priority');
  }

  const ticket = await ticketService.create({
    subject,
    description,
    priority,
    createdBy: req.user.id,
  });

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
  assertCanView(ticket, req.user);

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
    if (ticket.assigned_to !== req.user.id) {
      throw new AppError(403, 'You can only update tickets assigned to you');
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

  const ticket = await ticketService.assignTicket({
    ticketId: id,
    actorId: req.user.id,
    assignedTo,
    groupId,
  });

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
  assertCanView(ticket, req.user);

  const history = await ticketService.findHistory(id);
  res.json({ history });
}

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateStatus,
  updatePriority,
  assignTicket,
  deleteTicket,
  listHistory,
};
