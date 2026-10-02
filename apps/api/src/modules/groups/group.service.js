const pool = require('../../config/db');

async function findAll() {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.description,
            json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email))
              FILTER (WHERE u.id IS NOT NULL) AS members
     FROM groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     LEFT JOIN users u ON u.id = gm.user_id
     GROUP BY g.id
     ORDER BY g.id`
  );
  return rows;
}

module.exports = { findAll };
