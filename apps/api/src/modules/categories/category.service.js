const pool = require('../../config/db');

async function findIdByName(name) {
  const { rows } = await pool.query(
    'SELECT id FROM categories WHERE name = $1',
    [name]
  );
  return rows[0] ? rows[0].id : null;
}

module.exports = { findIdByName };
