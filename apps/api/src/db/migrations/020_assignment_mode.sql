-- ============================================
-- Migration 020: automatic assignment mode + last assignment tracking
-- ============================================

ALTER TABLE groups
  ADD COLUMN assignment_mode VARCHAR(20) NOT NULL DEFAULT 'manual'
  CHECK (assignment_mode IN ('manual', 'round_robin', 'load_based'));

ALTER TABLE users
  ADD COLUMN last_assigned_at TIMESTAMPTZ;
