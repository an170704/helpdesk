-- ============================================
-- Migration 003: technician role + support groups + ticket assignment
-- ============================================

BEGIN;

-- 1. Allow the technician role
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user','technician','admin'));

-- 2. Support groups
CREATE TABLE groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Group members (many-to-many)
CREATE TABLE group_members (
  group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

-- 4. Ticket assignment
ALTER TABLE tickets ADD COLUMN assigned_to INT REFERENCES users(id);
ALTER TABLE tickets ADD COLUMN group_id INT REFERENCES groups(id);

CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_group_id   ON tickets(group_id);

COMMIT;
