-- ============================================
-- Migration 010: settings (chatbot configuration)
-- ============================================

CREATE TABLE settings (
  key        VARCHAR(50) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
