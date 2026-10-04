-- ============================================
-- Migration 014: group categories (which categories a support group handles)
-- ============================================

CREATE TABLE group_categories (
  group_id    INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, category_id)
);
