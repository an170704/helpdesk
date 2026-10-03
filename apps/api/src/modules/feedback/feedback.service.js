const pool = require('../../config/db');

async function create({ ticketId, rating, comment, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO ticket_feedback (ticket_id, rating, comment, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, ticket_id, rating, comment, created_at`,
    [ticketId, rating, comment || null, createdBy]
  );
  return rows[0];
}

async function findByTicket(ticketId) {
  const { rows } = await pool.query(
    `SELECT f.id, f.rating, f.comment, f.created_at, u.full_name AS created_by_name
     FROM ticket_feedback f
     JOIN users u ON u.id = f.created_by
     WHERE f.ticket_id = $1`,
    [ticketId]
  );
  return rows[0] || null;
}

module.exports = { create, findByTicket };
