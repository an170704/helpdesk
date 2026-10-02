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
    `SELECT id, full_name, email, phone, role, is_active, created_at
     FROM users ${where}
     ORDER BY id`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, full_name, email, phone, role, is_active, created_at
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
       RETURNING id, full_name, email, phone, role, is_active, created_at`,
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
  };

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET full_name = $2, email = $3, phone = $4, role = $5, is_active = $6, updated_at = now()
       WHERE id = $1
       RETURNING id, full_name, email, phone, role, is_active, created_at`,
      [id, next.full_name, next.email, next.phone || null, next.role, next.is_active]
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

async function findTechnicians() {
  const { rows } = await pool.query(
    `SELECT id, full_name, email
     FROM users
     WHERE role = 'technician' AND is_active = TRUE
     ORDER BY full_name`
  );
  return rows;
}

module.exports = { findAll, findById, create, update, resetPassword, findTechnicians };
