-- ============================================
-- Migration 015: categories belong to a group (drop the group_categories junction)
-- ============================================

ALTER TABLE categories
  ADD COLUMN group_id INT REFERENCES groups(id) ON DELETE CASCADE;

-- Keep the assignments that already exist in the junction table
UPDATE categories c
SET group_id = gc.group_id
FROM group_categories gc
WHERE gc.category_id = c.id;

-- Auto-assign remaining categories whose root name matches "<Group name> Team"
UPDATE categories c
SET group_id = g.id
FROM groups g
WHERE c.group_id IS NULL
  AND g.name = COALESCE((SELECT p.name FROM categories p WHERE p.id = c.parent_id), c.name) || ' Team';

-- Name is now unique per group instead of globally
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

CREATE UNIQUE INDEX categories_group_name_key
  ON categories (group_id, name)
  WHERE group_id IS NOT NULL;

DROP TABLE group_categories;
