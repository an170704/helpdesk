-- ============================================
-- Migration 022: persist HelpBot conversations for audit/evaluation
-- ============================================

CREATE TABLE chat_messages (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id  VARCHAR(64) NOT NULL,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  model       VARCHAR(120),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages (session_id, created_at, id);
CREATE INDEX idx_chat_messages_user ON chat_messages (user_id, created_at DESC);
