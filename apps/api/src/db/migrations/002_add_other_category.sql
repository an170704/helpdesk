-- ============================================
-- Migration 002: add "Other" category (fallback for off-topic tickets)
-- ============================================

INSERT INTO categories (name, description)
VALUES ('Other', 'Off-topic or uncategorized requests')
ON CONFLICT (name) DO NOTHING;
