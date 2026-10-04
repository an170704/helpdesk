-- ============================================
-- Migration 013: drop unused social fields
-- ============================================

ALTER TABLE users DROP COLUMN facebook;
ALTER TABLE users DROP COLUMN twitter;
