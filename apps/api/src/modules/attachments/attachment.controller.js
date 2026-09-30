const AppError = require('../../utils/AppError');
const ticketService = require('../tickets/ticket.service');
const attachmentService = require('./attachment.service');

async function uploadAttachments(req, res) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }

  const ticket = await ticketService.findById(id);
  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  const isOwner = ticket.created_by === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'You do not have permission to attach files to this ticket');
  }

  const files = req.files || [];
  if (!files.length) {
    throw new AppError(400, 'No valid files uploaded (images only, max 5MB each)');
  }

  const attachments = await attachmentService.create(id, req.user.id, files);
  res.status(201).json({ attachments });
}

module.exports = { uploadAttachments };
