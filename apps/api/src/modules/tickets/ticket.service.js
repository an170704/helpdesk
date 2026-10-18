const pool = require('../../config/db');
const withTransaction = require('../../utils/withTransaction');
const AppError = require('../../utils/AppError');
const notificationService = require('../notifications/notification.service');
const groupService = require('../groups/group.service');
const { ALLOWED_TRANSITIONS, SLA_HOURS } = require('./ticket.constants');

// Shared SELECT: joins categories, assigned technician, group and creator names
const TICKET_SELECT = `
  SELECT t.*, c.name AS category_name,
         cp.name AS category_parent_name,
         au.full_name AS assigned_name,
         gg.name AS group_name,
         cu.full_name AS created_by_name,
         cu.avatar_url AS created_by_avatar
  FROM tickets t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN categories cp ON cp.id = c.parent_id
  LEFT JOIN users au ON au.id = t.assigned_to
  LEFT JOIN groups gg ON gg.id = t.group_id
  LEFT JOIN users cu ON cu.id = t.created_by
`;

async function create({
  subject,
  description,
  priority,
  status = 'pending',
  assignedTo = null,
  groupId = null,
  categoryId = null,
  createdBy,
  actorId,
}) {
  const actor = actorId == null ? createdBy : actorId;

  const ticket = await withTransaction(async (client) => {
    const dueAt = new Date(Date.now() + SLA_HOURS[priority] * 3600000);
    const finishedAt = new Date();
    const resolvedAt = status === 'resolved' || status === 'closed' ? finishedAt : null;
    const closedAt = status === 'closed' ? finishedAt : null;

    const { rows } = await client.query(
      `INSERT INTO tickets
         (subject, description, priority, status, assigned_to, group_id, category_id, created_by, due_at, resolved_at, closed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [subject, description, priority, status, assignedTo, groupId, categoryId, createdBy, dueAt, resolvedAt, closedAt]
    );
    const createdTicket = rows[0];

    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, to_status)
       VALUES ($1, $2, 'created', $3)`,
      [createdTicket.id, actor, createdTicket.status]
    );

    return createdTicket;
  });

  await notificationService.notifyAdmins(actor, {
    type: 'ticket_created',
    ticketId: ticket.id,
    message: `New ticket #${ticket.id}: ${ticket.subject}`,
  });

  if (createdBy !== actor) {
    await notificationService.createMany([createdBy], {
      type: 'ticket_created',
      ticketId: ticket.id,
      message: `A ticket was created on your behalf: #${ticket.id} ${ticket.subject}`,
    });
  }

  if (assignedTo && assignedTo !== actor) {
    await notificationService.createMany([assignedTo], {
      type: 'assigned',
      ticketId: ticket.id,
      message: `Ticket #${ticket.id} was assigned to you: ${ticket.subject}`,
    });
  }

  return await findById(ticket.id);
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
    `${TICKET_SELECT}
     WHERE t.assigned_to = $1
        OR t.created_by = $1
        OR (t.group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)
            AND t.assigned_to IS NULL)
     ORDER BY t.created_at DESC`,
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
      if (status === 'closed') {
        throw new AppError(403, 'Only admins can close tickets');
      }

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

  const updated = await findById(ticket.id);

  if (updated.created_by !== actorId) {
    await notificationService.createMany([updated.created_by], {
      type: 'status_changed',
      ticketId: updated.id,
      message: `Ticket #${updated.id} status changed to ${status}`,
    });
  }

  return updated;
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

    // Recalculate the SLA deadline from the moment the ticket was created
    const dueAt = new Date(new Date(current.created_at).getTime() + SLA_HOURS[priority] * 3600000);

    const { rows: updatedRows } = await client.query(
      `UPDATE tickets
       SET priority = $2, due_at = $3, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [ticketId, priority, dueAt]
    );

    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, note)
       VALUES ($1, $2, 'priority_changed', $3)`,
      [ticketId, actorId, `from ${current.priority} to ${priority} (due date recalculated)`]
    );

    return updatedRows[0];
  });

  return findById(ticket.id);
}

async function updateCategory({ ticketId, actorId, categoryId }) {
  const ticket = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
      [ticketId]
    );
    const current = rows[0];

    if (!current) {
      throw new AppError(404, 'Ticket not found');
    }

    let categoryLabel = 'category removed';
    if (categoryId != null) {
      const cat = (
        await client.query(
          `SELECT c.name, p.name AS parent_name
           FROM categories c
           LEFT JOIN categories p ON p.id = c.parent_id
           WHERE c.id = $1`,
          [categoryId]
        )
      ).rows[0];

      if (!cat) {
        throw new AppError(404, 'Category not found');
      }
      categoryLabel = `category: ${cat.parent_name ? `${cat.parent_name} > ${cat.name}` : cat.name}`;
    }

    await client.query(
      `UPDATE tickets
       SET category_id = $2, updated_at = now()
       WHERE id = $1`,
      [ticketId, categoryId]
    );

    await client.query(
      `INSERT INTO ticket_history (ticket_id, actor_id, action, note)
       VALUES ($1, $2, 'category_changed', $3)`,
      [ticketId, actorId, categoryLabel]
    );

    return current;
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

    if (assignedTo !== undefined && nextAssignedTo != null) {
      await client.query(
        'UPDATE users SET last_assigned_at = now() WHERE id = $1',
        [nextAssignedTo]
      );
    }

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

  const updated = await findById(ticket.id);

  if (assignedTo != null && assignedTo !== actorId) {
    await notificationService.createMany([assignedTo], {
      type: 'assigned',
      ticketId: updated.id,
      message: `Ticket #${updated.id} was assigned to you: ${updated.subject}`,
    });
  }

  if (groupId !== undefined && updated.group_id && !updated.assigned_to) {
    // Routed to a group without an individual assignee: notify that group's technicians
    const memberIds = await groupService.findMemberIds(updated.group_id);
    await notificationService.createMany(
      memberIds.filter((id) => id !== actorId),
      {
        type: 'assigned',
        ticketId: updated.id,
        message: `Ticket #${updated.id} was assigned to your group: ${updated.subject}`,
      }
    );
  }

  return updated;
}

async function deleteTicket(id) {
  const { rowCount } = await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
  if (rowCount === 0) {
    throw new AppError(404, 'Ticket not found');
  }
}

async function findRecent({ createdBy, assignedTo, limit = 10 }) {
  const column = createdBy ? 't.created_by' : 't.assigned_to';
  const value = createdBy || assignedTo;

  const { rows } = await pool.query(
    `${TICKET_SELECT} WHERE ${column} = $1 ORDER BY t.created_at DESC LIMIT $2`,
    [value, limit]
  );
  return rows;
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
  updateCategory,
  assignTicket,
  deleteTicket,
  findRecent,
  findHistory,
  findAttachments,
};
