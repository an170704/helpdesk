-- ============================================
-- Migration 004: user profile fields (phone, avatar)
-- ============================================

ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);
