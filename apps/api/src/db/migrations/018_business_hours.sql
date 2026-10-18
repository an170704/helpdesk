-- ============================================
-- Migration 018: per-group business hours (JSON schedule)
-- ============================================

ALTER TABLE groups
  ADD COLUMN business_hours JSONB;
