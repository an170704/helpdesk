-- ============================================
-- Migration 008: internal notes on ticket comments
-- ============================================

ALTER TABLE ticket_comments ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT FALSE;
