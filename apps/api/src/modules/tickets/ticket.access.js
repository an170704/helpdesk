const AppError = require('../../utils/AppError');

function assertCanView(ticket, user) {
  const isOwner = ticket.created_by === user.id;
  const isAdmin = user.role === 'admin';
  const isAssignedTech = user.role === 'technician' && ticket.assigned_to === user.id;

  if (!isOwner && !isAdmin && !isAssignedTech) {
    throw new AppError(403, 'You do not have permission to view this ticket');
  }
}

module.exports = { assertCanView };
