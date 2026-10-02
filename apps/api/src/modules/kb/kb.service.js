const pool = require('../../config/db');

async function findAllPublished() {
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.category_id, c.name AS category_name, a.created_at
     FROM kb_articles a
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.is_published = TRUE
     ORDER BY a.title`
  );
  return rows;
}

async function findByIdPublished(id) {
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.content, a.category_id, c.name AS category_name, a.created_at
     FROM kb_articles a
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.id = $1 AND a.is_published = TRUE`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAllPublished, findByIdPublished };
