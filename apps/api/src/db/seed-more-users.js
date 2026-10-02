require('dotenv').config({ quiet: true });
const pool = require('../config/db');

const EMPLOYEES = [
  ['binh.tran@company.com', 'Tran Van Binh'],
  ['chi.le@company.com', 'Le Thi Chi'],
  ['dung.pham@company.com', 'Pham Tien Dung'],
  ['hoa.hoang@company.com', 'Hoang Thanh Hoa'],
  ['khanh.vo@company.com', 'Vo Minh Khanh'],
  ['linh.dang@company.com', 'Dang Thuy Linh'],
  ['nam.bui@company.com', 'Bui Hoai Nam'],
  ['ngoc.do@company.com', 'Do Bao Ngoc'],
  ['tuan.ngo@company.com', 'Ngo Anh Tuan'],
  ['yen.duong@company.com', 'Duong Hai Yen'],
];

const TECHNICIANS = [
  ['tech3@company.com', 'Pham Quoc Viet', 'Network Team'],
  ['tech4@company.com', 'Hoang Thi Mai', 'Hardware Team'],
  ['tech5@company.com', 'Vo Duc Thang', 'General Team'],
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const [email, name] of EMPLOYEES) {
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, crypt('123456', gen_salt('bf')), $2, 'user')
         ON CONFLICT (email) DO NOTHING`,
        [email, name]
      );
    }

    for (const [email, name] of TECHNICIANS) {
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, crypt('123456', gen_salt('bf')), $2, 'technician')
         ON CONFLICT (email) DO NOTHING`,
        [email, name]
      );
    }

    for (const [email, , groupName] of TECHNICIANS) {
      await client.query(
        `INSERT INTO group_members (group_id, user_id)
         SELECT g.id, u.id FROM groups g, users u
         WHERE g.name = $1 AND u.email = $2
         ON CONFLICT DO NOTHING`,
        [groupName, email]
      );
    }

    // Spread the seeded demo tickets across the new employees
    const employees = await client.query(
      `SELECT id FROM users WHERE email = ANY($1::text[])`,
      [EMPLOYEES.map(([email]) => email)]
    );
    const employeeIds = employees.rows.map((r) => r.id);

    const demoTickets = await client.query('SELECT id FROM tickets WHERE id >= 22');
    for (const ticket of demoTickets.rows) {
      const requesterId = pick(employeeIds);
      await client.query('UPDATE tickets SET created_by = $2 WHERE id = $1', [ticket.id, requesterId]);
      await client.query(
        `UPDATE ticket_history SET actor_id = $2
         WHERE ticket_id = $1 AND action = 'created'`,
        [ticket.id, requesterId]
      );
    }

    await client.query('COMMIT');

    const counts = await client.query(
      `SELECT role, count(*) FROM users WHERE is_active GROUP BY role ORDER BY role`
    );
    console.log('users now: ' + counts.rows.map((r) => `${r.role}=${r.count}`).join(', '));
    console.log(`redistributed ${demoTickets.rowCount} demo tickets across ${employeeIds.length} employees`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
