const AppError = require('../../utils/AppError');
const ticketService = require('./ticket.service');
const { TICKET_STATUSES } = require('./ticket.constants');

function validateId(id) {
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'ID không hợp lệ');
  }
}

function assertCanView(ticket, user) {
  const isOwner = ticket.created_by === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'Bạn không có quyền xem ticket này');
  }
}

async function findTicketOrFail(id) {
  const ticket = await ticketService.findById(id);
  if (!ticket) {
    throw new AppError(404, 'Không tìm thấy ticket');
  }
  return ticket;
}

async function createTicket(req, res) {
  const subject = (req.body.subject || '').trim();
  const description = (req.body.description || '').trim();

  if (!subject || !description) {
    throw new AppError(400, 'subject và description là bắt buộc');
  }
  if (subject.length > 255) {
    throw new AppError(400, 'subject không được vượt quá 255 ký tự');
  }

  const ticket = await ticketService.create({
    subject,
    description,
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

  res.json({ ticket });
}

async function updateStatus(req, res) {
  const { id } = req.params;
  validateId(id);

  const { status, note } = req.body;
  if (!TICKET_STATUSES.includes(status)) {
    throw new AppError(400, 'Trạng thái không hợp lệ');
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
