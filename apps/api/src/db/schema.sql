-- ============================================
-- Helpdesk - Schema (chốt ngày 1)
-- ============================================

-- 1. NGƯỜI DÙNG
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          VARCHAR(10) NOT NULL DEFAULT 'user'
                CHECK (role IN ('user','admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. NHÓM SỰ CỐ (= nhãn SVM)
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TICKET
CREATE TABLE tickets (
  id            SERIAL PRIMARY KEY,
  subject       VARCHAR(255) NOT NULL,
  description   TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','resolved','closed')),
  priority      VARCHAR(10) NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high')),
  category_id   INT REFERENCES categories(id),
  confidence    REAL,
  created_by    INT NOT NULL REFERENCES users(id),
  reopen_count  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ
);

CREATE INDEX idx_tickets_status     ON tickets(status);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);

-- 4. TRAO ĐỔI TRÊN TICKET
CREATE TABLE ticket_comments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   INT NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);

-- 5. LỊCH SỬ TICKET
CREATE TABLE ticket_history (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id    INT REFERENCES users(id),
  action      VARCHAR(50) NOT NULL,
  from_status VARCHAR(20),
  to_status   VARCHAR(20),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. KNOWLEDGE BASE
CREATE TABLE kb_articles (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  content      TEXT NOT NULL,
  category_id  INT REFERENCES categories(id),
  author_id    INT REFERENCES users(id),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
