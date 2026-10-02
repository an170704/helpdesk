const pool = require('../../config/db');
const withTransaction = require('../../utils/withTransaction');
const AppError = require('../../utils/AppError');
const aiClient = require('../../services/aiClient');
const categoryService = require('../categories/category.service');
const { ALLOWED_TRANSITIONS } = require('./ticket.constants');

// Shared SELECT: joins categories, assigned technician, group and creator names
const TICKET_SELECT = `
  SELECT t.*, c.name AS category_name,
         cp.name AS category_parent_name,
         au.full_name AS assigned_name,
         gg.name AS group_name,
         cu.full_name AS created_by_name
  FROM tickets t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN categories cp ON cp.id = c.parent_id
  LEFT JOIN users au ON au.id = t.assigned_to
  LEFT JOIN groups gg ON gg.id = t.group_id
  LEFT JOIN users cu ON cu.id = t.created_by
`;

async function create({ subject, description, priority, createdBy }) {
  const ticket = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO tickets (subject, description, priority, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [subject, description, priority, createdBy]
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

async function findAllForTechnician(userId) {
  const { rows } = await pool.query(
    `${TICKET_SELECT} WHERE t.assigned_to = $1 OR t.created_by = $1 ORDER BY t.created_at DESC`,
    [userId]
  );
  return rows;
}

async function updateStatus({ ticketId, actorId, actorRole, status, note }) {
  const ticket = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
      [ticketId]
    );
    const current = rows[0];

    if (!current) {
      throw new AppError(404, 'Ticket not found');
    }

    if (current.status === status) {
      throw new AppError(400, `Ticket is already "${status}"`);
    }

    // Admins may set any status (including reopening); technicians follow the forward-only flow
    if (actorRole !== 'admin') {
      const allowed = ALLOWED_TRANSITIONS[current.status] || [];
      if (!allowed.includes(status)) {
        throw new AppError(
          400,
          `Cannot change status from "${current.status}" to "${status}"`
        );
      }
    }

    const finishedAt = new Date();
    const isReopen = status === 'pending' || status === 'in_progress';
    const resolvedAt = status === 'resolved' ? finishedAt : isReopen ? null : current.resolved_at;
    const closedAt = status === 'closed' ? finishedAt : isReopen ? null : current.closed_at;

    const { rows: updatedRows } = await client.query(
      `UPDATE tickets
       SET status      = $1,
           resolved_at = $3,
           closed_at   = $4,
           updated_at  = now()
       WHERE id = $2
       RETURNING *`,
      [status, ticketId, resolvedAt, closedAt]
    );

    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, from_status, to_status, note)
       VALUES ($1, $2, 'status_changed', $3, $4, $5)`,
      [ticketId, actorId, current.status, status, note || null]
    );

    return updatedRows[0];
  });

  return findById(ticket.id);
}

async function updatePriority({ ticketId, actorId, priority }) {
  const ticket = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
      [ticketId]
    );
    const current = rows[0];

    if (!current) {
      throw new AppError(404, 'Ticket not found');
    }
    if (current.priority === priority) {
      throw new AppError(400, `Priority is already "${priority}"`);
    }

    const { rows: updatedRows } = await client.query(
      `UPDATE tickets
       SET priority = $2, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [ticketId, priority]
    );

    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, note)
       VALUES ($1, $2, 'priority_changed', $3)`,
      [ticketId, actorId, `from ${current.priority} to ${priority}`]
    );

    return updatedRows[0];
  });

  return findById(ticket.id);
}

async function assignTicket({ ticketId, actorId, assignedTo, groupId }) {
  const ticket = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
      [ticketId]
    );
    const ticket = rows[0];

    if (!ticket) {
      throw new AppError(404, 'Ticket not found');
    }
    if (ticket.status === 'closed') {
      throw new AppError(400, 'Cannot assign a closed ticket');
    }

    let technician = null;
    if (assignedTo != null) {
      const tech = (
        await client.query('SELECT full_name, role FROM users WHERE id = $1', [assignedTo])
      ).rows[0];
      if (!tech) {
        throw new AppError(404, 'Technician not found');
      }
      if (tech.role !== 'technician') {
        throw new AppError(400, 'assigned_to must be a technician');
      }
      technician = tech;
    }

    let group = null;
    if (groupId != null) {
      const g = (
        await client.query('SELECT name FROM groups WHERE id = $1', [groupId])
      ).rows[0];
      if (!g) {
        throw new AppError(404, 'Group not found');
      }
      group = g;
    }

    const nextAssignedTo = assignedTo === undefined ? ticket.assigned_to : assignedTo;
    const nextGroupId = groupId === undefined ? ticket.group_id : groupId;

    const { rows: updatedRows } = await client.query(
      `UPDATE tickets
       SET assigned_to = $2, group_id = $3, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [ticketId, nextAssignedTo, nextGroupId]
    );

    const changes = [];
    if (assignedTo !== undefined) {
      changes.push(technician ? `assigned to ${technician.full_name}` : 'assignment removed');
    }
    if (groupId !== undefined) {
      changes.push(group ? `group: ${group.name}` : 'group removed');
    }

    const note = changes.length ? changes.join(', ') : null;

    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, note)
       VALUES ($1, $2, 'assigned', $3)`,
      [ticketId, actorId, note]
    );

    return updatedRows[0];
  });

  return findById(ticket.id);
}

async function deleteTicket(id) {
  const { rowCount } = await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
  if (rowCount === 0) {
    throw new AppError(404, 'Ticket not found');
  }
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

async function findAttachments(ticketId) {
  const { rows } = await pool.query(
    `SELECT id, file_name, file_url, created_at
     FROM ticket_attachments
     WHERE ticket_id = $1
     ORDER BY id ASC`,
    [ticketId]
  );
  return rows;
}

module.exports = {
  create,
  findById,
  findAll,
  findAllByUser,
  findAllForTechnician,
  updateStatus,
  updatePriority,
  assignTicket,
  deleteTicket,
  findHistory,
  findAttachments,
};
