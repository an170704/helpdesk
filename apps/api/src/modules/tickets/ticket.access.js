const pool = require('../../config/db');
const AppError = require('../../utils/AppError');

async function isInGroup(userId, groupId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return rows.length > 0;
}

async function assertCanView(ticket, user) {
  if (ticket.created_by === user.id || user.role === 'admin') {
    return;
  }

  if (user.role === 'technician') {
    if (ticket.assigned_to === user.id) {
      return;
    }
    if (!ticket.assigned_to && ticket.group_id && (await isInGroup(user.id, ticket.group_id))) {
      return;
    }
  }

  throw new AppError(403, 'You do not have permission to view this ticket');
}

module.exports = { assertCanView, isInGroup };
