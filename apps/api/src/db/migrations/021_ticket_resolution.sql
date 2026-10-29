-- ============================================
-- Migration 021: resolution summary + HelpBot opt-in for resolved tickets
-- ============================================

ALTER TABLE tickets
  ADD COLUMN resolution TEXT;

ALTER TABLE tickets
  ADD COLUMN bot_usable BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_tickets_bot_usable
  ON tickets (bot_usable)
  WHERE bot_usable = TRUE;
