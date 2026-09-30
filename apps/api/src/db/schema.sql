-- ============================================
-- Helpdesk - Schema
-- ============================================

-- 1. USERS
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20),
  avatar_url    VARCHAR(255),
  role          VARCHAR(10) NOT NULL DEFAULT 'user'
                CHECK (role IN ('user','technician','admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CATEGORIES (= SVM labels)
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SUPPORT GROUPS
CREATE TABLE groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. GROUP MEMBERS (many-to-many)
CREATE TABLE group_members (
  group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

-- 5. TICKET
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
  assigned_to   INT REFERENCES users(id),
  group_id      INT REFERENCES groups(id),
  reopen_count  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ
);

CREATE INDEX idx_tickets_status     ON tickets(status);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_group_id   ON tickets(group_id);

-- 6. TICKET COMMENTS
CREATE TABLE ticket_comments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   INT NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);

-- 7. TICKET HISTORY
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

-- 8. KNOWLEDGE BASE
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

-- 9. TICKET ATTACHMENTS
CREATE TABLE ticket_attachments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  file_url    VARCHAR(500) NOT NULL,
  uploaded_by INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_ticket ON ticket_attachments(ticket_id);
