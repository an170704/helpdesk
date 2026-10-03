-- ============================================
-- Migration 012: user contact fields (address, social)
-- ============================================

ALTER TABLE users ADD COLUMN address VARCHAR(255);
ALTER TABLE users ADD COLUMN facebook VARCHAR(255);
ALTER TABLE users ADD COLUMN twitter VARCHAR(255);
