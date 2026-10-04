-- ============================================
-- Migration 016: KB articles can be classified at group level too
-- ============================================

ALTER TABLE kb_articles
  ADD COLUMN group_id INT REFERENCES groups(id);
