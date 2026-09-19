-- ============================================
-- Migration 001: BIGINT -> INT (giữ nguyên dữ liệu)
-- ============================================

BEGIN;

-- 1. Bỏ khóa ngoại trước khi đổi kiểu cột
ALTER TABLE tickets         DROP CONSTRAINT tickets_category_id_fkey;
ALTER TABLE tickets         DROP CONSTRAINT tickets_created_by_fkey;
ALTER TABLE ticket_comments DROP CONSTRAINT ticket_comments_ticket_id_fkey;
ALTER TABLE ticket_comments DROP CONSTRAINT ticket_comments_author_id_fkey;
ALTER TABLE ticket_history  DROP CONSTRAINT ticket_history_ticket_id_fkey;
ALTER TABLE ticket_history  DROP CONSTRAINT ticket_history_actor_id_fkey;
ALTER TABLE kb_articles     DROP CONSTRAINT kb_articles_category_id_fkey;
ALTER TABLE kb_articles     DROP CONSTRAINT kb_articles_author_id_fkey;

-- 2. Đổi kiểu dữ liệu
ALTER TABLE users            ALTER COLUMN id TYPE integer;
ALTER TABLE categories       ALTER COLUMN id TYPE integer;
ALTER TABLE tickets          ALTER COLUMN id TYPE integer,
                             ALTER COLUMN category_id TYPE integer,
                             ALTER COLUMN created_by TYPE integer;
ALTER TABLE ticket_comments  ALTER COLUMN id TYPE integer,
                             ALTER COLUMN ticket_id TYPE integer,
                             ALTER COLUMN author_id TYPE integer;
ALTER TABLE ticket_history   ALTER COLUMN id TYPE integer,
                             ALTER COLUMN ticket_id TYPE integer,
                             ALTER COLUMN actor_id TYPE integer;
ALTER TABLE kb_articles      ALTER COLUMN id TYPE integer,
                             ALTER COLUMN category_id TYPE integer,
                             ALTER COLUMN author_id TYPE integer;

-- 3. Sequence về kiểu int
ALTER SEQUENCE users_id_seq            AS integer;
ALTER SEQUENCE categories_id_seq       AS integer;
ALTER SEQUENCE tickets_id_seq          AS integer;
ALTER SEQUENCE ticket_comments_id_seq  AS integer;
ALTER SEQUENCE ticket_history_id_seq   AS integer;
ALTER SEQUENCE kb_articles_id_seq      AS integer;

-- 4. Tạo lại khóa ngoại
ALTER TABLE tickets         ADD CONSTRAINT tickets_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES categories(id);
ALTER TABLE tickets         ADD CONSTRAINT tickets_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE ticket_comments ADD CONSTRAINT ticket_comments_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
ALTER TABLE ticket_comments ADD CONSTRAINT ticket_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id);
ALTER TABLE ticket_history  ADD CONSTRAINT ticket_history_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
ALTER TABLE ticket_history  ADD CONSTRAINT ticket_history_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES users(id);
ALTER TABLE kb_articles     ADD CONSTRAINT kb_articles_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES categories(id);
ALTER TABLE kb_articles     ADD CONSTRAINT kb_articles_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id);

COMMIT;
