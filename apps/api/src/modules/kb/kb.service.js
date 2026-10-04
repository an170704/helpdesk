const pool = require('../../config/db');

const ARTICLE_SELECT = `
  SELECT a.id, a.title, a.content, a.category_id, a.group_id, a.is_published, a.created_at, a.updated_at,
         c.name AS category_name,
         g.name AS group_name,
         u.full_name AS author_name
  FROM kb_articles a
  LEFT JOIN categories c ON c.id = a.category_id
  LEFT JOIN groups g ON g.id = a.group_id
  LEFT JOIN users u ON u.id = a.author_id
`;

async function findAllPublished() {
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.category_id, a.group_id,
            c.name AS category_name, g.name AS group_name, a.created_at
     FROM kb_articles a
     LEFT JOIN categories c ON c.id = a.category_id
     LEFT JOIN groups g ON g.id = a.group_id
     WHERE a.is_published = TRUE
     ORDER BY a.title`
  );
  return rows;
}

async function findAllAdmin() {
  const { rows } = await pool.query(
    `${ARTICLE_SELECT} ORDER BY a.updated_at DESC, a.id DESC`
  );
  return rows;
}

async function findById(id, includeDrafts) {
  const { rows } = await pool.query(
    `${ARTICLE_SELECT} WHERE a.id = $1 ${includeDrafts ? '' : 'AND a.is_published = TRUE'}`,
    [id]
  );
  return rows[0] || null;
}

async function create({ title, content, categoryId, groupId, isPublished, authorId }) {
  const { rows } = await pool.query(
    `INSERT INTO kb_articles (title, content, category_id, group_id, author_id, is_published)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [title, content, categoryId, groupId, authorId, isPublished]
  );
  return rows[0].id;
}

async function update(id, changes) {
  const { rows } = await pool.query(
    `UPDATE kb_articles
     SET title = $2, content = $3, category_id = $4, group_id = $5, is_published = $6, updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [id, changes.title, changes.content, changes.categoryId, changes.groupId, changes.isPublished]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM kb_articles WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAllPublished, findAllAdmin, findById, create, update, remove };
