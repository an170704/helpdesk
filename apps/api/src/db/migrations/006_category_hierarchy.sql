-- ============================================
-- Migration 006: hierarchical categories (4 parents + children)
-- ============================================

ALTER TABLE categories ADD COLUMN parent_id INT REFERENCES categories(id);

-- Printer becomes a child of Hardware (existing tickets keep their category_id)
UPDATE categories
SET parent_id = (SELECT id FROM categories WHERE name = 'Hardware')
WHERE name = 'Printer';

-- Parent descriptions
UPDATE categories SET description = 'Network issues, Wi-Fi, VPN, connectivity' WHERE name = 'Network';
UPDATE categories SET description = 'Hardware failures and devices' WHERE name = 'Hardware';
UPDATE categories SET description = 'Software bugs, applications, operating systems' WHERE name = 'Software';
UPDATE categories SET description = 'Account issues, passwords, permissions' WHERE name = 'Account';

-- Subcategories
INSERT INTO categories (name, description, parent_id) VALUES
  ('WiFi', 'Wi-Fi connectivity issues', (SELECT id FROM categories WHERE name = 'Network')),
  ('VPN', 'VPN connection issues', (SELECT id FROM categories WHERE name = 'Network')),
  ('Internet', 'Internet access issues', (SELECT id FROM categories WHERE name = 'Network')),
  ('PC/Laptop', 'Desktop and laptop computers', (SELECT id FROM categories WHERE name = 'Hardware')),
  ('Monitor', 'Monitors and displays', (SELECT id FROM categories WHERE name = 'Hardware')),
  ('Peripherals', 'Keyboards, mice and other peripherals', (SELECT id FROM categories WHERE name = 'Hardware')),
  ('Windows/OS', 'Windows and operating system issues', (SELECT id FROM categories WHERE name = 'Software')),
  ('Office/Applications', 'Office apps and business software', (SELECT id FROM categories WHERE name = 'Software')),
  ('Password', 'Password and login issues', (SELECT id FROM categories WHERE name = 'Account')),
  ('Permissions', 'Access rights and permissions', (SELECT id FROM categories WHERE name = 'Account'))
ON CONFLICT (name) DO NOTHING;
