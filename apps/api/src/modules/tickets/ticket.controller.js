const AppError = require('../../utils/AppError');
const ticketService = require('./ticket.service');
const { TICKET_STATUSES, TICKET_PRIORITIES } = require('./ticket.constants');

function validateId(id) {
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }
}

function assertCanView(ticket, user) {
  const isOwner = ticket.created_by === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'You do not have permission to view this ticket');
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
  const isAdmin = req.user.role === 'admin';
  const tickets = isAdmin
    ? await ticketService.findAll()
    : await ticketService.findAllByUser(req.user.id);

  res.json({ tickets });
}

async function getTicket(req, res) {
  const { id } = req.params;
  validateId(id);

  const ticket = await findTicketOrFail(id);
  assertCanView(ticket, req.user);

  const attachments = await ticketService.findAttachments(id);
  res.json({ ticket: { ...ticket, attachments } });
}

async function updateStatus(req, res) {
  const { id } = req.params;
  validateId(id);

  const { status, note } = req.body;
  if (!TICKET_STATUSES.includes(status)) {
    throw new AppError(400, 'Invalid status');
  }

  const ticket = await ticketService.updateStatus({
    ticketId: id,
    actorId: req.user.id,
    status,
    note,
  });

  res.json({ ticket });
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
  listHistory,
};
