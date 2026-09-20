const pool = require('../../config/db');
const withTransaction = require('../../utils/withTransaction');
const AppError = require('../../utils/AppError');
const aiClient = require('../../services/aiClient');
const categoryService = require('../categories/category.service');
const { ALLOWED_TRANSITIONS } = require('./ticket.constants');

// Shared SELECT: joins categories to include category_name
const TICKET_SELECT = `
  SELECT t.*, c.name AS category_name
  FROM tickets t
  LEFT JOIN categories c ON c.id = t.category_id
`;

async function create({ subject, description, createdBy }) {
  const ticket = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO tickets (subject, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [subject, description, createdBy]
    );
    const createdTicket = rows[0];

    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, to_status)
       VALUES ($1, $2, 'created', $3)`,
      [createdTicket.id, createdBy, createdTicket.status]
    );

    return createdTicket;
  });

  return await classify(ticket);
}

// Calls the AI service and stores category_id + confidence on the ticket.
// If the AI service fails, the ticket is still returned (category stays null).
async function classify(ticket) {
  try {
    const { category, confidence } = await aiClient.predictCategory({
      subject: ticket.subject,
      description: ticket.description,
    });

    const categoryId = await categoryService.findIdByName(category);
    if (!categoryId) {
      return ticket;
    }

    await pool.query(
      `UPDATE tickets
       SET category_id = $2, confidence = $3, updated_at = now()
       WHERE id = $1`,
      [ticket.id, categoryId, confidence]
    );

    return await findById(ticket.id);
  } catch (err) {
    console.error('AI classification failed:', err.message);
    return ticket;
  }
}

async function findById(id) {
  const { rows } = await pool.query(
    `${TICKET_SELECT} WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findAll() {
  const { rows } = await pool.query(
    `${TICKET_SELECT} ORDER BY t.created_at DESC`
  );
  return rows;
}

async function findAllByUser(userId) {
  const { rows } = await pool.query(
    `${TICKET_SELECT} WHERE t.created_by = $1 ORDER BY t.created_at DESC`,
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
      throw new AppError(404, 'Ticket not found');
    }

    const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(status)) {
      throw new AppError(
        400,
        `Cannot change status from "${ticket.status}" to "${status}"`
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
