-- ============================================
-- Helpdesk - Seed data (run once)
-- ============================================

-- Enable bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Support groups
INSERT INTO groups (name, description) VALUES
  ('Network',  'Handles network, Wi-Fi, VPN issues'),
  ('Hardware', 'Handles computers, laptops, devices'),
  ('Software', 'Handles software, applications and email issues'),
  ('Account',  'Handles passwords, permissions and access requests'),
  ('General',  'Handles uncategorized and miscellaneous requests')
ON CONFLICT (name) DO NOTHING;

-- Sample accounts (password: 123456)
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@company.com',  crypt('123456', gen_salt('bf')), 'Admin IT',     'admin'),
  ('user@company.com',   crypt('123456', gen_salt('bf')), 'Nguyen Van A', 'user'),
  ('tech1@company.com',  crypt('123456', gen_salt('bf')), 'Minh Nguyen',  'technician'),
  ('tech2@company.com',  crypt('123456', gen_salt('bf')), 'Lan Tran',     'technician')
ON CONFLICT (email) DO NOTHING;

-- Categories: each belongs to one group; flat (no parent categories needed —
-- the group dropdown prefixes them with the group name automatically)
INSERT INTO categories (name, description, group_id) VALUES
  ('Internet', 'Internet access issues',                       (SELECT id FROM groups WHERE name = 'Network')),
  ('VPN', 'VPN connection issues',                             (SELECT id FROM groups WHERE name = 'Network')),
  ('WiFi', 'Wi-Fi connectivity issues',                        (SELECT id FROM groups WHERE name = 'Network')),
  ('Networking', 'General network and connectivity requests',  (SELECT id FROM groups WHERE name = 'Network')),
  ('PC/Laptop', 'Desktop and laptop computers',                (SELECT id FROM groups WHERE name = 'Hardware')),
  ('Monitor', 'Monitors and displays',                         (SELECT id FROM groups WHERE name = 'Hardware')),
  ('Printer', 'Printer, scanner, office equipment issues',     (SELECT id FROM groups WHERE name = 'Hardware')),
  ('Peripherals', 'Keyboards, mice and other peripherals',     (SELECT id FROM groups WHERE name = 'Hardware')),
  ('Windows/OS', 'Windows and operating system issues',        (SELECT id FROM groups WHERE name = 'Software')),
  ('Office/Applications', 'Office apps and business software', (SELECT id FROM groups WHERE name = 'Software')),
  ('Email', 'Email and Outlook issues',                        (SELECT id FROM groups WHERE name = 'Software')),
  ('Password', 'Password and login issues',                    (SELECT id FROM groups WHERE name = 'Account')),
  ('Permissions', 'Access rights and permissions',             (SELECT id FROM groups WHERE name = 'Account')),
  ('Other', 'Off-topic or uncategorized requests',             (SELECT id FROM groups WHERE name = 'General'))
ON CONFLICT DO NOTHING;

-- Technicians in groups
INSERT INTO group_members (group_id, user_id) VALUES
  ((SELECT id FROM groups WHERE name = 'Network'),  (SELECT id FROM users WHERE email = 'tech1@company.com')),
  ((SELECT id FROM groups WHERE name = 'Hardware'), (SELECT id FROM users WHERE email = 'tech1@company.com')),
  ((SELECT id FROM groups WHERE name = 'Software'), (SELECT id FROM users WHERE email = 'tech2@company.com')),
  ((SELECT id FROM groups WHERE name = 'Account'),  (SELECT id FROM users WHERE email = 'tech2@company.com')),
  ((SELECT id FROM groups WHERE name = 'General'),  (SELECT id FROM users WHERE email = 'tech2@company.com'))
ON CONFLICT DO NOTHING;
