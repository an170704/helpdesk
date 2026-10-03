-- ============================================
-- Migration 011: SLA due dates + customer satisfaction feedback
-- ============================================

ALTER TABLE tickets ADD COLUMN due_at TIMESTAMPTZ;
CREATE INDEX idx_tickets_due_at ON tickets(due_at);

CREATE TABLE ticket_feedback (
  id         SERIAL PRIMARY KEY,
  ticket_id  INT NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  rating     VARCHAR(10) NOT NULL CHECK (rating IN ('positive','neutral','negative')),
  comment    TEXT,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill SLA deadlines for existing tickets (high 8h, medium 24h, low 72h)
UPDATE tickets
SET due_at = created_at + (CASE priority
  WHEN 'high' THEN interval '8 hours'
  WHEN 'low' THEN interval '72 hours'
  ELSE interval '24 hours'
END);
