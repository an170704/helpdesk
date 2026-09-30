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

-- Sample accounts (password: 123456)
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@company.com',  crypt('123456', gen_salt('bf')), 'Admin IT',     'admin'),
  ('user@company.com',   crypt('123456', gen_salt('bf')), 'Nguyen Van A', 'user'),
  ('tech1@company.com',  crypt('123456', gen_salt('bf')), 'Minh Nguyen',  'technician'),
  ('tech2@company.com',  crypt('123456', gen_salt('bf')), 'Lan Tran',     'technician')
ON CONFLICT (email) DO NOTHING;

-- Support groups
INSERT INTO groups (name, description) VALUES
  ('Network Team',  'Handles network, Wi-Fi, VPN issues'),
  ('Hardware Team', 'Handles computers, laptops, devices'),
  ('General Team',  'Handles software, account and printer issues')
ON CONFLICT (name) DO NOTHING;

-- Technicians in groups
INSERT INTO group_members (group_id, user_id) VALUES
  ((SELECT id FROM groups WHERE name = 'Network Team'),
   (SELECT id FROM users WHERE email = 'tech1@company.com')),
  ((SELECT id FROM groups WHERE name = 'Hardware Team'),
   (SELECT id FROM users WHERE email = 'tech1@company.com')),
  ((SELECT id FROM groups WHERE name = 'General Team'),
   (SELECT id FROM users WHERE email = 'tech2@company.com'))
ON CONFLICT DO NOTHING;
