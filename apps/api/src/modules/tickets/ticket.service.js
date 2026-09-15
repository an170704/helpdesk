const pool = require('../../config/db');

async function create({ subject, description, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO tickets (subject, description, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [subject, description, createdBy]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM tickets WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function findAll() {
  const { rows } = await pool.query(
    'SELECT * FROM tickets ORDER BY created_at DESC'
  );
  return rows;
}

async function findAllByUser(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM tickets WHERE created_by = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

module.exports = { create, findById, findAll, findAllByUser };
