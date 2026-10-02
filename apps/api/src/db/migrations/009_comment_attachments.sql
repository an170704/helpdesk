-- ============================================
-- Migration 009: attachments on ticket comments
-- ============================================

ALTER TABLE ticket_attachments ADD COLUMN comment_id INT REFERENCES ticket_comments(id) ON DELETE CASCADE;
