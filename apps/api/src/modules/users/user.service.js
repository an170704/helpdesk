const bcrypt = require('bcryptjs');
const pool = require('../../config/db');
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
    `SELECT id, full_name, email, phone, role, is_active, avatar_url, address, facebook, twitter, created_at
     FROM users ${where}
     ORDER BY id`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, full_name, email, phone, role, is_active, avatar_url, address, facebook, twitter, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ fullName, email, phone, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, phone, role, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, role, is_active, avatar_url, address, facebook, twitter, created_at`,
      [fullName, email.toLowerCase(), phone || null, role, passwordHash]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(400, 'Email already exists');
    }
    throw err;
  }
}

async function update(id, changes) {
  const current = await findById(id);
  if (!current) {
    throw new AppError(404, 'User not found');
  }

  const next = {
    full_name: changes.full_name !== undefined ? changes.full_name.trim() : current.full_name,
    email: changes.email !== undefined ? changes.email.toLowerCase() : current.email,
    phone: changes.phone !== undefined ? changes.phone : current.phone,
    role: changes.role !== undefined ? changes.role : current.role,
    is_active: changes.is_active !== undefined ? changes.is_active : current.is_active,
    address: changes.address !== undefined ? changes.address : current.address,
    facebook: changes.facebook !== undefined ? changes.facebook : current.facebook,
    twitter: changes.twitter !== undefined ? changes.twitter : current.twitter,
  };

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET full_name = $2, email = $3, phone = $4, role = $5, is_active = $6,
           address = $7, facebook = $8, twitter = $9, updated_at = now()
       WHERE id = $1
       RETURNING id, full_name, email, phone, role, is_active, avatar_url, address, facebook, twitter, created_at`,
      [
        id,
        next.full_name,
        next.email,
        next.phone || null,
        next.role,
        next.is_active,
        next.address || null,
        next.facebook || null,
        next.twitter || null,
      ]
    );
    return rows[0];
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

async function findTechnicians() {
  const { rows } = await pool.query(
    `SELECT id, full_name, email
     FROM users
     WHERE role = 'technician' AND is_active = TRUE
     ORDER BY full_name`
  );
  return rows;
}

module.exports = { findAll, findById, create, update, resetPassword, getTicketStats, findTechnicians };
