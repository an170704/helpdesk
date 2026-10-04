const pool = require('../../config/db');
const withTransaction = require('../../utils/withTransaction');
const AppError = require('../../utils/AppError');

async function findAll() {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.description,
            (SELECT count(*)::int FROM tickets t WHERE t.group_id = g.id) AS ticket_count,
            (SELECT count(*)::int FROM categories c WHERE c.group_id = g.id) AS category_count,
            COALESCE((
              SELECT json_agg(c.id)
              FROM categories c
              WHERE c.group_id = g.id
            ), '[]') AS category_ids,
            COALESCE(
              json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email))
                FILTER (WHERE u.id IS NOT NULL),
              '[]'
            ) AS members
     FROM groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     LEFT JOIN users u ON u.id = gm.user_id
     GROUP BY g.id
     ORDER BY g.id`
  );
  return rows;
}

async function findOne(id) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.description,
            (SELECT count(*)::int FROM tickets t WHERE t.group_id = g.id) AS ticket_count,
            COALESCE((
              SELECT json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email))
              FROM group_members gm
              JOIN users u ON u.id = gm.user_id
              WHERE gm.group_id = g.id
            ), '[]') AS members,
            COALESCE((
              SELECT json_agg(c.id)
              FROM categories c
              WHERE c.group_id = g.id
            ), '[]') AS category_ids
     FROM groups g
     WHERE g.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT id, name FROM groups WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findOptions() {
  const { rows } = await pool.query(
    `SELECT g.id, g.name,
            COALESCE((
              SELECT json_agg(c.id)
              FROM categories c
              WHERE c.group_id = g.id
            ), '[]') AS category_ids
     FROM groups g
     ORDER BY g.name`
  );
  return rows;
}

async function findMemberIds(groupId) {
  const { rows } = await pool.query(
    'SELECT user_id FROM group_members WHERE group_id = $1',
    [groupId]
  );
  return rows.map((r) => r.user_id);
}

async function create({ name, description }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id, name, description`,
      [name, description || null]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(400, 'Group name already exists');
    }
    throw err;
  }
}

async function update(id, { name, description }) {
  try {
    const { rows } = await pool.query(
      `UPDATE groups SET name = $2, description = $3 WHERE id = $1 RETURNING id, name, description`,
      [id, name, description || null]
    );
    if (!rows[0]) {
      throw new AppError(404, 'Group not found');
    }
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(400, 'Group name already exists');
    }
    throw err;
  }
}

async function remove(id) {
  const { rows } = await pool.query(
    'SELECT count(*)::int AS count FROM tickets WHERE group_id = $1',
    [id]
  );
  if (rows[0].count > 0) {
    throw new AppError(
      400,
      `Group is assigned to ${rows[0].count} ticket(s) — reassign them first`
    );
  }

  const { rowCount } = await pool.query('DELETE FROM groups WHERE id = $1', [id]);
  if (rowCount === 0) {
    throw new AppError(404, 'Group not found');
  }
}

async function addMembersByEmail(groupId, emails) {
  const group = await findById(groupId);
  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  const list = [
    ...new Set(
      (Array.isArray(emails) ? emails : [])
        .map((email) => String(email).trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  if (!list.length) {
    throw new AppError(400, 'emails are required');
  }

  const { rows } = await pool.query(
    `SELECT id, email, role, is_active
     FROM users
     WHERE lower(email) = ANY($1::text[])`,
    [list]
  );

  const valid = rows.filter((row) => row.role === 'technician' && row.is_active);
  const known = new Set(valid.map((row) => row.email.toLowerCase()));
  const unknown = list.filter((email) => !known.has(email));

  if (!valid.length) {
    throw new AppError(400, 'No matching technicians found for those emails');
  }

  await pool.query(
    `INSERT INTO group_members (group_id, user_id)
     SELECT $1, unnest($2::int[])
     ON CONFLICT DO NOTHING`,
    [groupId, valid.map((row) => row.id)]
  );

  return { added: valid.length, unknown };
}

async function removeMember(groupId, userId) {
  const { rowCount } = await pool.query(
    'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  if (rowCount === 0) {
    throw new AppError(404, 'Member not found');
  }
}

async function setMembers(id, userIds) {
  if (!Array.isArray(userIds)) {
    throw new AppError(400, 'user_ids must be an array');
  }

  const ids = [...new Set(userIds.map(Number))];
  if (ids.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new AppError(400, 'Invalid user_ids');
  }

  const group = await findById(id);
  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  if (ids.length) {
    const { rows } = await pool.query(
      'SELECT id, role FROM users WHERE id = ANY($1::int[])',
      [ids]
    );
    if (rows.length !== ids.length) {
      throw new AppError(404, 'User not found');
    }
    if (rows.some((user) => user.role !== 'technician')) {
      throw new AppError(400, 'Only technicians can join support groups');
    }
  }

  await withTransaction(async (client) => {
    await client.query('DELETE FROM group_members WHERE group_id = $1', [id]);
    if (ids.length) {
      await client.query(
        `INSERT INTO group_members (group_id, user_id)
         SELECT $2, unnest($1::int[])`,
        [ids, id]
      );
    }
  });
}

module.exports = {
  findAll,
  findOne,
  findById,
  findOptions,
  findMemberIds,
  create,
  update,
  remove,
  setMembers,
  addMembersByEmail,
  removeMember,
};
