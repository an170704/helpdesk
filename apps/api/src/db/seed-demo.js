require('dotenv').config({ quiet: true });
const pool = require('../config/db');

const SAMPLES = [
  { category: 'WiFi', subject: 'WiFi keeps disconnecting in the meeting room', description: 'The connection drops every few minutes on the 3rd floor' },
  { category: 'WiFi', subject: 'Cannot connect to office WiFi', description: 'My laptop cannot join the company wireless network' },
  { category: 'WiFi', subject: 'Slow WiFi since this morning', description: 'Web pages load very slowly on wireless' },
  { category: 'WiFi', subject: 'Guest WiFi password not working', description: 'Visitors cannot log in with the shared guest password' },
  { category: 'VPN', subject: 'VPN cannot connect from home', description: 'The client shows error 800 when connecting' },
  { category: 'VPN', subject: 'VPN drops every 10 minutes', description: 'Connection keeps dropping during file transfer' },
  { category: 'VPN', subject: 'Need VPN access for new contractor', description: 'Please create VPN credentials for the new hire' },
  { category: 'VPN', subject: 'VPN very slow during peak hours', description: 'Remote desktop is unusable from 9 to 11 am' },
  { category: 'Internet', subject: 'No internet on accounting PC', description: 'The network icon shows connected but there is no internet' },
  { category: 'Internet', subject: 'Internet down for the whole HR floor', description: 'Everyone lost connectivity after the power cut' },
  { category: 'Internet', subject: 'Cannot open any website', description: 'Browser shows DNS error on all sites' },
  { category: 'Internet', subject: 'Frequent disconnects on wired network', description: 'The LAN connection resets several times a day' },
  { category: 'PC/Laptop', subject: 'Laptop will not power on', description: 'Pressing the power button does nothing at all' },
  { category: 'PC/Laptop', subject: 'Computer extremely slow', description: 'Takes 10 minutes to boot Windows' },
  { category: 'PC/Laptop', subject: 'Blue screen on marketing desktop', description: 'BSOD appears randomly several times a day' },
  { category: 'PC/Laptop', subject: 'Laptop battery drains too fast', description: 'Battery lasts less than one hour after full charge' },
  { category: 'PC/Laptop', subject: 'Docking station not charging laptop', description: 'The dock powers the monitors but not the laptop' },
  { category: 'Monitor', subject: 'Monitor shows no signal', description: 'The screen stays black when docked' },
  { category: 'Monitor', subject: 'Second monitor not detected', description: 'Only one display shows in settings' },
  { category: 'Monitor', subject: 'Flickering screen on reception PC', description: 'Display flickers when adjusting the cable' },
  { category: 'Monitor', subject: 'Wrong resolution after update', description: 'Everything looks stretched since the driver update' },
  { category: 'Printer', subject: 'Printer jam on 2nd floor', description: 'Paper stuck and the error light is on' },
  { category: 'Printer', subject: 'Printer not printing', description: 'Jobs stay in the queue forever' },
  { category: 'Printer', subject: 'Toner replacement needed', description: 'Low toner warning on the finance printer' },
  { category: 'Printer', subject: 'Scanner not feeding documents', description: 'The scanner pulls multiple pages at once' },
  { category: 'Printer', subject: 'Print quality poor with lines', description: 'Vertical lines appear on every printed page' },
  { category: 'Peripherals', subject: 'Keyboard keys not working', description: 'Several keys do not respond' },
  { category: 'Peripherals', subject: 'Wireless mouse lagging', description: 'Cursor jumps and stutters on screen' },
  { category: 'Peripherals', subject: 'USB headset not recognized', description: 'Call center headset not detected by the PC' },
  { category: 'Peripherals', subject: 'Webcam not detected in Teams', description: 'Camera shows a black preview in meetings' },
  { category: 'Windows/OS', subject: 'Windows update stuck', description: 'Update hangs at 30 percent for hours' },
  { category: 'Windows/OS', subject: 'Need Windows reinstall', description: 'System files corrupted after the crash' },
  { category: 'Windows/OS', subject: 'OS activation failed', description: 'License warning appears after the update' },
  { category: 'Windows/OS', subject: 'Login takes forever', description: 'Signing in takes more than five minutes' },
  { category: 'Office/Applications', subject: 'Excel crashes on large file', description: 'Spreadsheet closes when opening the monthly report' },
  { category: 'Office/Applications', subject: 'Outlook cannot send email', description: 'Messages are stuck in the outbox' },
  { category: 'Office/Applications', subject: 'Teams audio not working', description: 'Microphone is not detected in meetings' },
  { category: 'Office/Applications', subject: 'Word not saving documents', description: 'Save button does nothing in shared files' },
  { category: 'Office/Applications', subject: 'Browser keeps crashing', description: 'The browser closes itself when opening many tabs' },
  { category: 'Password', subject: 'Forgot my domain password', description: 'Cannot log in after the long vacation' },
  { category: 'Password', subject: 'Account locked after failed attempts', description: 'Need to unlock my account' },
  { category: 'Password', subject: 'Password reset for email', description: 'Please reset my mailbox password' },
  { category: 'Password', subject: 'SSO login loop on intranet', description: 'The intranet keeps redirecting to the login page' },
  { category: 'Permissions', subject: 'Need access to shared finance folder', description: 'No permission to the accounting drive' },
  { category: 'Permissions', subject: 'Cannot access project management system', description: 'Account lacks the right role' },
  { category: 'Permissions', subject: 'Request read access to payroll reports', description: 'Need view permission for the audit' },
  { category: 'Permissions', subject: 'Need rights to install approved software', description: 'Installation is blocked by policy' },
  { category: 'Other', subject: 'Request new office chair', description: 'The current chair is broken' },
  { category: 'Other', subject: 'Where can I park my motorbike', description: 'Question about the new parking rules' },
  { category: 'Other', subject: 'Register for the company event', description: 'Please add me to the participant list' },
  { category: 'Other', subject: 'Coffee machine in the pantry is broken', description: 'The machine leaks water' },
  { category: 'Other', subject: 'Book a meeting room for Friday', description: 'Need a room for eight people at 2 pm' },
];

const PARENT_BY_CATEGORY = {
  WiFi: 'Network', VPN: 'Network', Internet: 'Network',
  'PC/Laptop': 'Hardware', Monitor: 'Hardware', Printer: 'Hardware', Peripherals: 'Hardware',
  'Windows/OS': 'Software', 'Office/Applications': 'Software',
  Password: 'Account', Permissions: 'Account',
  Other: 'Other',
};

const GROUP_BY_PARENT = { Network: 'Network', Hardware: 'Hardware', Software: 'Software', Account: 'Account', Other: 'General' };
const TECH_BY_PARENT = { Network: 'tech1@company.com', Hardware: 'tech1@company.com', Software: 'tech2@company.com', Account: 'tech2@company.com', Other: 'tech2@company.com' };

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(list) {
  return list[randomInt(0, list.length - 1)];
}

function pickStatus(ageDays) {
  if (ageDays > 30) return pick(['closed', 'closed', 'closed', 'closed', 'closed', 'resolved', 'in_progress']);
  if (ageDays > 7) return pick(['closed', 'closed', 'resolved', 'resolved', 'in_progress', 'pending']);
  return pick(['pending', 'pending', 'in_progress', 'in_progress', 'resolved', 'closed']);
}

async function main() {
  const cats = await pool.query('SELECT id, name FROM categories');
  const catMap = Object.fromEntries(cats.rows.map((r) => [r.name, r.id]));

  const users = await pool.query("SELECT id, email FROM users");
  const userMap = Object.fromEntries(users.rows.map((r) => [r.email, r.id]));

  const groups = await pool.query('SELECT id, name FROM groups');
  const groupMap = Object.fromEntries(groups.rows.map((r) => [r.name, r.id]));

  const requesterId = userMap['user@company.com'];
  const adminId = userMap['admin@company.com'];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let inserted = 0;

    for (const sample of SAMPLES) {
      const ageDays = randomInt(1, 175);
      const createdAt = new Date(Date.now() - ageDays * 86400000 - randomInt(0, 20) * 3600000);
      const status = pickStatus(ageDays);
      const priority = pick(['medium', 'medium', 'medium', 'low', 'low', 'high', 'high']);
      const categoryId = catMap[sample.category];
      const confidence = Math.round((0.55 + Math.random() * 0.45) * 100) / 100;

      const parent = PARENT_BY_CATEGORY[sample.category];
      const resolvedAt = status === 'resolved' || status === 'closed'
        ? new Date(createdAt.getTime() + randomInt(2, 48) * 3600000)
        : null;
      const closedAt = status === 'closed'
        ? new Date(resolvedAt.getTime() + randomInt(1, 24) * 3600000)
        : null;
      const updatedAt = closedAt || resolvedAt || createdAt;

      const isWorkedOn = status !== 'pending';
      const assignTech = isWorkedOn || Math.random() < 0.3;
      const assignedTo = assignTech ? userMap[TECH_BY_PARENT[parent]] || null : null;
      const groupId = assignTech && GROUP_BY_PARENT[parent] ? groupMap[GROUP_BY_PARENT[parent]] : null;
      const actor = assignedTo || adminId;

      const { rows } = await client.query(
        `INSERT INTO tickets
           (subject, description, status, priority, category_id, confidence,
            created_by, assigned_to, group_id, created_at, updated_at, resolved_at, closed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [sample.subject, sample.description, status, priority, categoryId, confidence,
          requesterId, assignedTo, groupId, createdAt, updatedAt, resolvedAt, closedAt]
      );
      const ticketId = rows[0].id;

      await client.query(
        `INSERT INTO ticket_history (ticket_id, actor_id, action, to_status, created_at)
         VALUES ($1, $2, 'created', 'pending', $3)`,
        [ticketId, requesterId, createdAt]
      );

      let stepTime = new Date(createdAt.getTime() + randomInt(15, 120) * 60000);

      if (assignedTo) {
        const groupName = GROUP_BY_PARENT[parent];
        await client.query(
          `INSERT INTO ticket_history (ticket_id, actor_id, action, note, created_at)
           VALUES ($1, $2, 'assigned', $3, $4)`,
          [ticketId, adminId, groupName ? `assigned to ${groupName}` : 'assigned to a technician', stepTime]
        );
      }

      if (status !== 'pending') {
        const transitions = status === 'in_progress' ? ['in_progress']
          : status === 'resolved' ? ['in_progress', 'resolved']
            : ['in_progress', 'resolved', 'closed'];

        let from = 'pending';
        for (const to of transitions) {
          stepTime = new Date(stepTime.getTime() + randomInt(30, 600) * 60000);
          await client.query(
            `INSERT INTO ticket_history (ticket_id, actor_id, action, from_status, to_status, created_at)
             VALUES ($1, $2, 'status_changed', $3, $4, $5)`,
            [ticketId, actor, from, to, stepTime]
          );
          from = to;
        }
      }

      inserted += 1;
    }

    await client.query('COMMIT');
    console.log(`seeded ${inserted} demo tickets`);
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
