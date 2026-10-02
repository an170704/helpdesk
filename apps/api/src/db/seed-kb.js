require('dotenv').config({ quiet: true });
const pool = require('../config/db');

const ARTICLES = [
  {
    category: 'Password',
    title: 'How to reset your domain password',
    content: `1. Go to the company self-service portal.
2. Sign in with your current credentials.
3. Click "Reset password" and follow the prompts.
4. Choose a new password with at least 12 characters.
5. Sign in to your computer and email with the new password.

If you are locked out completely, contact the IT helpdesk to unlock your account.`,
  },
  {
    category: 'WiFi',
    title: 'How to connect to the office WiFi',
    content: `1. Click the network icon in the taskbar.
2. Select the "COMPANY" network (not the guest network).
3. Enter your domain username and password when prompted.
4. Accept the certificate warning.

Note: the guest network is only for visitors — employees should always use "COMPANY".`,
  },
  {
    category: 'VPN',
    title: 'How to set up the company VPN',
    content: `1. Install the VPN client from the software center.
2. Open the client and choose the "Office" profile.
3. Sign in with your domain account.
4. Approve the multi-factor prompt on your phone.

If the connection drops repeatedly, try switching to a wired network first.`,
  },
  {
    category: 'Printer',
    title: 'How to fix a paper jam in the office printer',
    content: `1. Turn off the printer by the power button.
2. Open the front and rear covers.
3. Gently pull the jammed paper in the direction of the paper path.
4. Check the paper tray for misaligned sheets.
5. Close the covers and turn the printer back on.

Do not pull the paper sharply — torn pieces cause new jams.`,
  },
  {
    category: 'Printer',
    title: 'How to replace the toner cartridge',
    content: `1. Turn off the printer and open the front cover.
2. Pull the old cartridge straight out.
3. Shake the new cartridge gently five to six times.
4. Insert the new cartridge until it clicks.
5. Close the cover and print a test page.

Delivered empty cartridges should go to the recycling box in the IT room.`,
  },
  {
    category: 'PC/Laptop',
    title: 'Laptop battery drains fast — what to do',
    content: `1. Open the battery usage report in Windows settings.
2. Close apps that run in the background.
3. Lower the screen brightness and disable the keyboard light.
4. If the battery lasts under 1 hour after these steps, open a ticket for a battery replacement.`,
  },
  {
    category: 'Monitor',
    title: 'External monitor shows no signal',
    content: `1. Check that the monitor is powered on (LED light).
2. Press Windows + P and choose "Extend".
3. Reseat the HDMI/DisplayPort cable on both ends.
4. Try another port on the docking station.

If it still fails on another dock, open a ticket for a cable replacement.`,
  },
  {
    category: 'Windows/OS',
    title: 'Windows update is stuck — safe steps',
    content: `1. Leave the machine powered on for at least 2 hours.
2. Do not force shutdown during the update.
3. If it is still stuck, open a ticket with the error code.

The IT team will clear the update cache remotely.`,
  },
  {
    category: 'Office/Applications',
    title: 'Outlook cannot send emails',
    content: `1. Check your mailbox quota first (large attachments block sending).
2. Switch to Work Offline and back to Online.
3. Repair the account from control panel: Mail -> Repair.
4. Reboot and try again.

Messages stuck in the outbox may be too large — use a SharePoint link instead of an attachment.`,
  },
  {
    category: 'Office/Applications',
    title: 'Teams microphone is not working',
    content: `1. In Teams, open Settings -> Devices and select the correct microphone.
2. Check the Windows sound settings — the right device must be default.
3. Make sure the headset is not muted (hardware switch).
4. Test the microphone in Teams settings before a meeting.`,
  },
  {
    category: 'Internet',
    title: 'No internet on a wired network',
    content: `1. Check the network cable on both ends.
2. Run "ipconfig /release" then "ipconfig /renew".
3. Test another wall port or another cable.
4. If only one port is affected, open a ticket for the network team.`,
  },
  {
    category: 'Permissions',
    title: 'How to request access to a shared folder',
    content: `1. Open a ticket with the folder path and the reason for access.
2. Your manager must approve the request.
3. The IT team grants read or read-write access.
4. Access appears after the next sign-in.`,
  },
];

async function main() {
  const admin = await pool.query("SELECT id FROM users WHERE email = 'admin@company.com'");
  const adminId = admin.rows[0].id;
  const cats = await pool.query('SELECT id, name FROM categories');
  const catMap = Object.fromEntries(cats.rows.map((r) => [r.name, r.id]));

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const article of ARTICLES) {
      await client.query(
        `INSERT INTO kb_articles (title, content, category_id, author_id, is_published)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT DO NOTHING`,
        [article.title, article.content, catMap[article.category] || null, adminId]
      );
    }

    await client.query('COMMIT');

    const count = await pool.query('SELECT count(*) FROM kb_articles WHERE is_published');
    console.log(`seeded KB articles: ${count.rows[0].count} published`);
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
