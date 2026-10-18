const pool = require('../../config/db');
const AppError = require('../../utils/AppError');
const settingService = require('../settings/setting.service');
const ticketService = require('./ticket.service');

const FALLBACK_CAPACITY = 5;

function compareByLastAssignment(a, b) {
  const aTime = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
  const bTime = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
  if (aTime !== bTime) return aTime - bTime;
  return a.id - b.id;
}

async function getDefaultCapacity() {
  const raw = await settingService.getValue(settingService.KEY_DEFAULT_MAX_OPEN_TICKETS);
  return raw != null && /^\d+$/.test(raw) ? Number(raw) : FALLBACK_CAPACITY;
}

// Selects the best agent in a group using round-robin or load-based routing.
// Agents at their open-ticket capacity are skipped (capacity 0 = never assign).
async function pickAgentForGroup(groupId) {
  const groupResult = await pool.query(
    'SELECT id, assignment_mode FROM groups WHERE id = $1',
    [groupId]
  );
  const group = groupResult.rows[0];
  if (!group) {
    throw new AppError(404, 'Group not found');
  }
  if (group.assignment_mode === 'manual') {
    return null;
  }

  const defaultCapacity = await getDefaultCapacity();

  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.max_open_tickets, u.last_assigned_at,
            (SELECT count(*)::int
             FROM tickets t
             WHERE t.assigned_to = u.id AND t.status IN ('pending', 'in_progress')) AS open_tickets
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1 AND u.role = 'technician' AND u.is_active = TRUE
     ORDER BY u.id`,
    [groupId]
  );

  const candidates = rows.filter((member) => {
    const capacity = member.max_open_tickets == null ? defaultCapacity : member.max_open_tickets;
    return member.open_tickets < capacity;
  });

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => {
    if (group.assignment_mode === 'load_based' && a.open_tickets !== b.open_tickets) {
      return a.open_tickets - b.open_tickets;
    }
    return compareByLastAssignment(a, b);
  });

  return candidates[0];
}

// Routes an unassigned ticket to an agent in its group (manual groups are skipped).
// If the ticket has no group yet, the group is derived from its category.
async function autoAssignTicket(ticketId, { actorId = null } = {}) {
  const ticket = await ticketService.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  if (ticket.assigned_to || ['resolved', 'closed'].includes(ticket.status)) {
    return ticket;
  }

  // Overdue tickets are escalated manually, not auto-assigned
  if (ticket.due_at && new Date(ticket.due_at).getTime() < Date.now()) {
    return ticket;
  }

  let groupId = ticket.group_id;
  if (!groupId && ticket.category_id) {
    const category = await pool.query(
      'SELECT group_id FROM categories WHERE id = $1',
      [ticket.category_id]
    );
    groupId = category.rows[0] ? category.rows[0].group_id : null;
  }

  // Unclassified tickets fall back to the General (catch-all) team
  if (!groupId) {
    const fallback = await pool.query(
      "SELECT id FROM groups WHERE lower(name) = 'general' LIMIT 1"
    );
    groupId = fallback.rows[0] ? fallback.rows[0].id : null;
  }

  if (!groupId) {
    return ticket;
  }

  if (!ticket.group_id) {
    await pool.query(
      'UPDATE tickets SET group_id = $2, updated_at = now() WHERE id = $1',
      [ticket.id, groupId]
    );
  }

  const { rows } = await pool.query(
    'SELECT id, assignment_mode FROM groups WHERE id = $1',
    [groupId]
  );
  const group = rows[0];

  if (!group || group.assignment_mode === 'manual') {
    return ticket;
  }

  const agent = await pickAgentForGroup(group.id);
  if (!agent) {
    return ticket;
  }

  await ticketService.assignTicket({
    ticketId: ticket.id,
    actorId,
    assignedTo: agent.id,
  });

  return ticketService.findById(ticket.id);
}

module.exports = { pickAgentForGroup, autoAssignTicket };
