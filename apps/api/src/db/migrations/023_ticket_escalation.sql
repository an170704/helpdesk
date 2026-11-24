-- ============================================
-- Migration 023: overdue escalation marker
-- ============================================

ALTER TABLE tickets
  ADD COLUMN escalated_at TIMESTAMPTZ;

CREATE INDEX idx_tickets_escalated_at
  ON tickets (escalated_at)
  WHERE escalated_at IS NOT NULL;
