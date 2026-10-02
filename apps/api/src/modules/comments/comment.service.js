const pool = require('../../config/db');

async function findByTicket(ticketId, includeInternal) {
  const { rows: comments } = await pool.query(
    `SELECT tc.id, tc.body, tc.is_internal, tc.created_at,
            u.id AS author_id, u.full_name AS author_name, u.role AS author_role
     FROM ticket_comments tc
     JOIN users u ON u.id = tc.author_id
     WHERE tc.ticket_id = $1 AND ($2::boolean OR tc.is_internal = FALSE)
     ORDER BY tc.created_at ASC, tc.id ASC`,
    [ticketId, includeInternal]
  );

  if (!comments.length) return [];

  const ids = comments.map((c) => c.id);
  const { rows: attachments } = await pool.query(
    `SELECT id, comment_id, file_name, file_url
     FROM ticket_attachments
     WHERE comment_id = ANY($1::int[])
     ORDER BY id ASC`,
    [ids]
  );

  return comments.map((comment) => ({
    ...comment,
    attachments: attachments.filter((a) => a.comment_id === comment.id),
  }));
}

async function create({ ticketId, authorId, body, isInternal }) {
  const { rows } = await pool.query(
    `INSERT INTO ticket_comments (ticket_id, author_id, body, is_internal)
     VALUES ($1, $2, $3, $4)
     RETURNING id, body, is_internal, created_at`,
    [ticketId, authorId, body, isInternal]
  );
  return rows[0];
}

module.exports = { findByTicket, create };
