-- ============================================
-- Migration 019: per-agent open-ticket capacity for auto-assignment
-- NULL = use the workspace default; 0 = do not auto-assign
-- ============================================

ALTER TABLE users
  ADD COLUMN max_open_tickets INT
  CHECK (max_open_tickets IS NULL OR max_open_tickets >= 0);
