const pool = require('../../config/db');
const AppError = require('../../utils/AppError');

async function createMany(userIds, { type, ticketId, message }) {
  const ids = userIds.filter((id) => id != null);
  if (!ids.length) return;

  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, ticket_id, message)
       SELECT unnest($1::int[]), $2, $3, $4`,
      [ids, type, ticketId, message]
    );
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
}

async function notifyAdmins(actorId, { type, ticketId, message }) {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE AND id <> $1`,
    [actorId]
  );
  await createMany(rows.map((r) => r.id), { type, ticketId, message });
}

async function findForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, type, ticket_id, message, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 30`,
    [userId]
  );

  const { rows: countRows } = await pool.query(
    'SELECT count(*)::int AS unread FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );

  return { notifications: rows, unread: countRows[0].unread };
}

async function markRead(id, userId) {
  const { rowCount } = await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (rowCount === 0) {
    throw new Error('Notification not found');
  }
}

async function markAllRead(userId) {
  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
}

async function remove(id, userId) {
  const { rowCount } = await pool.query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (rowCount === 0) {
    throw new AppError(404, 'Notification not found');
  }
}

async function removeAll(userId) {
  await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
}

module.exports = { createMany, notifyAdmins, findForUser, markRead, markAllRead, remove, removeAll };
