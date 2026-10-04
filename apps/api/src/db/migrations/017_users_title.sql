-- ============================================
-- Migration 017: custom label (title) for staff — agents can rename their role display
-- ============================================

ALTER TABLE users
  ADD COLUMN title VARCHAR(100);
