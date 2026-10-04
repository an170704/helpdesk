const pool = require('../../config/db');
const AppError = require('../../utils/AppError');

async function findAll() {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.parent_id, c.group_id, p.name AS parent_name
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     ORDER BY c.group_id NULLS LAST, COALESCE(p.id, c.id), c.parent_id NULLS FIRST, c.name`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, name, parent_id, group_id FROM categories WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function create({ name, description, parentId, groupId }) {
  if (parentId != null) {
    const parent = await pool.query('SELECT id FROM categories WHERE id = $1', [parentId]);
    if (!parent.rows[0]) {
      throw new AppError(404, 'Parent category not found');
    }
  }

  if (groupId != null) {
    const group = await pool.query('SELECT id FROM groups WHERE id = $1', [groupId]);
    if (!group.rows[0]) {
      throw new AppError(404, 'Group not found');
    }
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO categories (name, description, parent_id, group_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, parent_id, group_id`,
      [name, description || null, parentId || null, groupId || null]
    );

    const created = rows[0];
    if (created.parent_id) {
      const parent = await pool.query('SELECT name FROM categories WHERE id = $1', [created.parent_id]);
      created.parent_name = parent.rows[0] ? parent.rows[0].name : null;
    } else {
      created.parent_name = null;
    }
    return created;
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(400, 'Category name already exists in this group');
    }
    throw err;
  }
}

async function remove(id) {
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM tickets t WHERE t.category_id = $1) AS tickets,
       (SELECT count(*)::int FROM kb_articles k WHERE k.category_id = $1) AS articles`,
    [id]
  );
  const usage = rows[0];

  if (usage.tickets > 0 || usage.articles > 0) {
    throw new AppError(
      400,
      `Category is used by ${usage.tickets} ticket(s) and ${usage.articles} article(s) — reassign them first`
    );
  }

  // Subcategories stay: they become flat categories of the same group
  await pool.query('UPDATE categories SET parent_id = NULL WHERE parent_id = $1', [id]);

  const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  if (rowCount === 0) {
    throw new AppError(404, 'Category not found');
  }
}

module.exports = { findAll, findById, create, remove };
