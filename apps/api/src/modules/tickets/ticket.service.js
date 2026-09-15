const pool = require('../../config/db');
const withTransaction = require('../../utils/withTransaction');
const AppError = require('../../utils/AppError');
const { ALLOWED_TRANSITIONS } = require('./ticket.constants');

async function create({ subject, description, createdBy }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO tickets (subject, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [subject, description, createdBy]
    );
    const ticket = rows[0];

    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, to_status)
       VALUES ($1, $2, 'created', $3)`,
      [ticket.id, createdBy, ticket.status]
    );

    return ticket;
  });
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM tickets WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function findAll() {
  const { rows } = await pool.query(
    'SELECT * FROM tickets ORDER BY created_at DESC'
  );
  return rows;
}

async function findAllByUser(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM tickets WHERE created_by = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function updateStatus({ ticketId, actorId, status, note }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
      [ticketId]
    );
    const ticket = rows[0];

    if (!ticket) {
      throw new AppError(404, 'Không tìm thấy ticket');
    }

    const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(
        400,
        `Không thể chuyển trạng thái từ "${ticket.status}" sang "${status}"`
      );
    }

    const finishedAt = new Date();
    const resolvedAt = status === 'resolved' ? finishedAt : null;
    const closedAt = status === 'closed' ? finishedAt : null;

    const { rows: updatedRows } = await client.query(
      `UPDATE tickets
       SET status      = $1,
           resolved_at = COALESCE($3, resolved_at),
           closed_at   = COALESCE($4, closed_at),
           updated_at  = now()
       WHERE id = $2
       RETURNING *`,
      [status, ticketId, resolvedAt, closedAt]
    );

    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, from_status, to_status, note)
       VALUES ($1, $2, 'status_changed', $3, $4, $5)`,
      [ticketId, actorId, ticket.status, status, note || null]
    );

    return updatedRows[0];
  });
}

async function findHistory(ticketId) {
  const { rows } = await pool.query(
    `SELECT h.id, h.action, h.from_status, h.to_status, h.note, h.created_at,
            u.full_name AS actor_name
     FROM ticket_history h
     LEFT JOIN users u ON u.id = h.actor_id
     WHERE h.ticket_id = $1
     ORDER BY h.created_at ASC, h.id ASC`,
    [ticketId]
  );
  return rows;
}

module.exports = {
  create,
  findById,
  findAll,
  findAllByUser,
  updateStatus,
  findHistory,
};
