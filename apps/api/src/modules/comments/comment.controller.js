const AppError = require('../../utils/AppError');
const ticketService = require('../tickets/ticket.service');
const { assertCanView } = require('../tickets/ticket.access');
const notificationService = require('../notifications/notification.service');
const groupService = require('../groups/group.service');
const attachmentService = require('../attachments/attachment.service');
const commentService = require('./comment.service');

function validateId(id) {
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }
}

async function loadTicket(req) {
  const { id } = req.params;
  validateId(id);

  const ticket = await ticketService.findById(id);
  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  await assertCanView(ticket, req.user);
  return ticket;
}

async function listComments(req, res) {
  const ticket = await loadTicket(req);
  const isStaff = req.user.role === 'admin' || req.user.role === 'technician';

  const comments = await commentService.findByTicket(ticket.id, isStaff);
  res.json({ comments });
}

async function createComment(req, res) {
  const ticket = await loadTicket(req);

  const body = (req.body.body || '').trim();
  if (!body) {
    throw new AppError(400, 'body is required');
  }
  if (body.length > 5000) {
    throw new AppError(400, 'body must not exceed 5000 characters');
  }

  const isStaff = req.user.role === 'admin' || req.user.role === 'technician';
  const isInternal = isStaff && (req.body.is_internal === true || req.body.is_internal === 'true');

  const comment = await commentService.create({
    ticketId: ticket.id,
    authorId: req.user.id,
    body,
    isInternal,
  });

  const files = req.files || [];
  if (files.length) {
    await attachmentService.create({
      ticketId: ticket.id,
      uploadedBy: req.user.id,
      commentId: comment.id,
      files,
    });
  }

  if (isInternal) {
    await notificationService.notifyAdmins(req.user.id, {
      type: 'comment',
      ticketId: ticket.id,
      message: `Internal note on ticket #${ticket.id}: ${ticket.subject}`,
    });
  } else {
    const recipients = new Set(
      [ticket.created_by, ticket.assigned_to].filter(
        (userId) => userId && userId !== req.user.id
      )
    );

    if (!ticket.assigned_to && ticket.group_id) {
      // Unassigned but routed to a group: notify the technicians of that group
      const memberIds = await groupService.findMemberIds(ticket.group_id);
      for (const memberId of memberIds) {
        if (memberId !== req.user.id) recipients.add(memberId);
      }
    } else if (!ticket.assigned_to) {
      // Nobody is working on it and no group routes it: notify the admins
      const adminIds = await notificationService.getAdminIds(req.user.id);
      for (const adminId of adminIds) recipients.add(adminId);
    }

    await notificationService.createMany([...recipients], {
      type: 'comment',
      ticketId: ticket.id,
      message: `New reply on ticket #${ticket.id}: ${ticket.subject}`,
    });
  }

  res.status(201).json({ comment });
}

module.exports = { listComments, createComment };
