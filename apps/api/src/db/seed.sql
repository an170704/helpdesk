-- ============================================
-- Helpdesk - Seed data (run once)
-- ============================================

-- Enable bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Categories: 5 SVM labels + Other (fallback for off-topic tickets)
INSERT INTO categories (name, description) VALUES
  ('Network',  'Network issues, Wi-Fi, internal connectivity'),
  ('Hardware', 'Hardware failures, computers, devices'),
  ('Software', 'Software bugs, applications, operating systems'),
  ('Account',  'Account issues, passwords, permissions'),
  ('Printer',  'Printer, scanner, office equipment issues'),
  ('Other',    'Off-topic or uncategorized requests')
ON CONFLICT (name) DO NOTHING;

-- 2 sample accounts (password: 123456)
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@company.com', crypt('123456', gen_salt('bf')), 'Admin IT',        'admin'),
  ('user@company.com',  crypt('123456', gen_salt('bf')), 'Nguyen Van A',    'user')
ON CONFLICT (email) DO NOTHING;
