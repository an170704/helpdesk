const bcrypt = require('bcryptjs');
const pool = require('../../config/db');
const withTransaction = require('../../utils/withTransaction');
const AppError = require('../../utils/AppError');

async function findAll({ role, search } = {}) {
  const conditions = [];
  const params = [];

  if (role && role !== 'all') {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT id, full_name, email, phone, role, title, max_open_tickets, last_assigned_at,
            is_active, avatar_url, address, created_at
     FROM users ${where}
     ORDER BY id`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, full_name, email, phone, role, title, max_open_tickets, last_assigned_at,
            is_active, avatar_url, address, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function validateGroupIds(groupIds) {
  if (!Array.isArray(groupIds)) {
    throw new AppError(400, 'group_ids must be an array');
  }

  const ids = [...new Set(groupIds.map(Number))];
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new AppError(400, 'Invalid group_ids');
  }
  if (!ids.length) return [];

  const { rows } = await pool.query('SELECT id FROM groups WHERE id = ANY($1::int[])', [ids]);
  if (rows.length !== ids.length) {
    throw new AppError(404, 'Group not found');
  }
  return ids;
}

async function create({ fullName, email, phone, address, role, title, maxOpenTickets, password, groupIds = [] }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const groups = await validateGroupIds(groupIds);

  if (role !== 'technician' && groups.length) {
    throw new AppError(400, 'Groups can only be assigned to technicians');
  }

  try {
    return await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (full_name, email, phone, address, role, title, max_open_tickets, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, full_name, email, phone, role, title, max_open_tickets,
                   is_active, avatar_url, address, created_at`,
        [
          fullName,
          email.toLowerCase(),
          phone || null,
          address || null,
          role,
          title || null,
          maxOpenTickets == null ? null : Number(maxOpenTickets),
          passwordHash,
        ]
      );
      const user = rows[0];

      if (groups.length) {
        await client.query(
          `INSERT INTO group_members (group_id, user_id)
           SELECT unnest($1::int[]), $2
           ON CONFLICT DO NOTHING`,
          [groups, user.id]
        );
      }

      return user;
    });
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(400, 'Email already exists');
    }
    throw err;
  }
}

async function update(id, changes, groupIds) {
  const current = await findById(id);
  if (!current) {
    throw new AppError(404, 'User not found');
  }

  const next = {
    full_name: changes.full_name !== undefined ? changes.full_name.trim() : current.full_name,
    email: changes.email !== undefined ? changes.email.toLowerCase() : current.email,
    phone: changes.phone !== undefined ? changes.phone : current.phone,
    role: changes.role !== undefined ? changes.role : current.role,
    title: changes.title !== undefined ? changes.title : current.title,
    max_open_tickets:
      changes.max_open_tickets !== undefined
        ? changes.max_open_tickets
        : current.max_open_tickets,
    is_active: changes.is_active !== undefined ? changes.is_active : current.is_active,
    address: changes.address !== undefined ? changes.address : current.address,
    avatar_url: changes.avatar_url !== undefined ? changes.avatar_url : current.avatar_url,
  };

  if (next.role !== 'technician') {
    next.title = null;
  }

  let groups = [];
  if (groupIds !== undefined) {
    groups = await validateGroupIds(groupIds);
    if (next.role !== 'technician' && groups.length) {
      throw new AppError(400, 'Groups can only be assigned to technicians');
    }
  }

  try {
    return await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE users
         SET full_name = $2, email = $3, phone = $4, role = $5, is_active = $6,
             address = $7, title = $8, max_open_tickets = $9, avatar_url = $10,
             updated_at = now()
         WHERE id = $1
         RETURNING id, full_name, email, phone, role, title, max_open_tickets,
                   is_active, avatar_url, address, created_at`,
        [
          id,
          next.full_name,
          next.email,
          next.phone || null,
          next.role,
          next.is_active,
          next.address || null,
          next.title || null,
          next.max_open_tickets == null ? null : Number(next.max_open_tickets),
          next.avatar_url || null,
        ]
      );
      const user = rows[0];

      if (groupIds !== undefined) {
        await client.query('DELETE FROM group_members WHERE user_id = $1', [id]);
        if (groups.length) {
          await client.query(
            `INSERT INTO group_members (group_id, user_id)
             SELECT unnest($1::int[]), $2
             ON CONFLICT DO NOTHING`,
            [groups, id]
          );
        }
      } else if (user.role !== 'technician') {
        await client.query('DELETE FROM group_members WHERE user_id = $1', [id]);
      }

      return user;
    });
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(400, 'Email already exists');
    }
    throw err;
  }
}

async function resetPassword(id, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const { rowCount } = await pool.query(
    'UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1',
    [id, passwordHash]
  );
  if (rowCount === 0) {
    throw new AppError(404, 'User not found');
  }
}

async function getTicketStats(userId) {
  const [createdResult, assignedResult, csatResult] = await Promise.all([
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status IN ('pending','in_progress'))::int AS open,
              count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
              count(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM tickets WHERE created_by = $1`,
      [userId]
    ),
    pool.query(
      'SELECT count(*)::int AS total FROM tickets WHERE assigned_to = $1',
      [userId]
    ),
    pool.query(
      `SELECT f.rating, count(*)::int AS count
       FROM ticket_feedback f
       JOIN tickets t ON t.id = f.ticket_id
       WHERE t.assigned_to = $1
       GROUP BY f.rating`,
      [userId]
    ),
  ]);

  const csat = { positive: 0, neutral: 0, negative: 0, total: 0 };
  for (const row of csatResult.rows) {
    csat[row.rating] = row.count;
    csat.total += row.count;
  }
  csat.positivePercent = csat.total ? Math.round((csat.positive / csat.total) * 100) : null;

  return {
    created: createdResult.rows[0],
    assignedTotal: assignedResult.rows[0].total,
    csat,
  };
}

async function findGroupsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name
     FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     WHERE gm.user_id = $1
     ORDER BY g.name`,
    [userId]
  );
  return rows;
}

async function findTechnicians() {
  const { rows } = await pool.query(
    `SELECT id, full_name, email
     FROM users
     WHERE role = 'technician' AND is_active = TRUE
     ORDER BY full_name`
  );
  return rows;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  resetPassword,
  getTicketStats,
  findGroupsForUser,
  findTechnicians,
};
