const AppError = require('../../utils/AppError');
const ticketService = require('../tickets/ticket.service');
const feedbackService = require('./feedback.service');

const RATINGS = ['positive', 'neutral', 'negative'];

async function createFeedback(req, res) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }

  const ticket = await ticketService.findById(id);
  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  if (ticket.created_by !== req.user.id) {
    throw new AppError(403, 'Only the requester can rate this ticket');
  }
  if (!['resolved', 'closed'].includes(ticket.status)) {
    throw new AppError(400, 'You can rate the support after the ticket is resolved');
  }

  const { rating, comment } = req.body || {};
  if (!RATINGS.includes(rating)) {
    throw new AppError(400, 'Invalid rating');
  }
  if (comment && String(comment).length > 1000) {
    throw new AppError(400, 'comment must not exceed 1000 characters');
  }

  const existing = await feedbackService.findByTicket(id);
  if (existing) {
    throw new AppError(400, 'Feedback already submitted');
  }

  const feedback = await feedbackService.create({
    ticketId: id,
    rating,
    comment: comment ? String(comment).trim() : null,
    createdBy: req.user.id,
  });

  res.status(201).json({ feedback });
}

module.exports = { createFeedback };
