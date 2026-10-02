-- ============================================
-- Helpdesk - Seed data (run once)
-- ============================================

-- Enable bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Categories: 4 SVM labels + Other; subcategories hang under their parent
INSERT INTO categories (name, description) VALUES
  ('Network',  'Network issues, Wi-Fi, VPN, connectivity'),
  ('Hardware', 'Hardware failures and devices'),
  ('Software', 'Software bugs, applications, operating systems'),
  ('Account',  'Account issues, passwords, permissions'),
  ('Other',    'Off-topic or uncategorized requests')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description, parent_id) VALUES
  ('WiFi', 'Wi-Fi connectivity issues', (SELECT id FROM categories WHERE name = 'Network')),
  ('VPN', 'VPN connection issues', (SELECT id FROM categories WHERE name = 'Network')),
  ('Internet', 'Internet access issues', (SELECT id FROM categories WHERE name = 'Network')),
  ('PC/Laptop', 'Desktop and laptop computers', (SELECT id FROM categories WHERE name = 'Hardware')),
  ('Monitor', 'Monitors and displays', (SELECT id FROM categories WHERE name = 'Hardware')),
  ('Printer', 'Printer, scanner, office equipment issues', (SELECT id FROM categories WHERE name = 'Hardware')),
  ('Peripherals', 'Keyboards, mice and other peripherals', (SELECT id FROM categories WHERE name = 'Hardware')),
  ('Windows/OS', 'Windows and operating system issues', (SELECT id FROM categories WHERE name = 'Software')),
  ('Office/Applications', 'Office apps and business software', (SELECT id FROM categories WHERE name = 'Software')),
  ('Password', 'Password and login issues', (SELECT id FROM categories WHERE name = 'Account')),
  ('Permissions', 'Access rights and permissions', (SELECT id FROM categories WHERE name = 'Account'))
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
