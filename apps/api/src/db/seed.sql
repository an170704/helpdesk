-- ============================================
-- Helpdesk - Seed data (chạy 1 lần)
-- ============================================

-- Bật tiện ích băm mật khẩu bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5 nhóm sự cố (= nhãn SVM)
INSERT INTO categories (name, description) VALUES
  ('Network',  'Sự cố mạng, Wi-Fi, kết nối nội bộ'),
  ('Hardware', 'Hỏng hóc phần cứng, máy tính, thiết bị'),
  ('Software', 'Lỗi phần mềm, ứng dụng, hệ điều hành'),
  ('Account',  'Vấn đề tài khoản, mật khẩu, phân quyền'),
  ('Printer',  'Lỗi máy in, scan, thiết bị văn phòng')
ON CONFLICT (name) DO NOTHING;

-- 2 tài khoản mẫu (mật khẩu: 123456)
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@company.com', crypt('123456', gen_salt('bf')), 'Admin IT',        'admin'),
  ('user@company.com',  crypt('123456', gen_salt('bf')), 'Nguyen Van A',    'user')
ON CONFLICT (email) DO NOTHING;
