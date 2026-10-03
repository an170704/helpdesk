require('dotenv').config({ quiet: true });
const pool = require('../config/db');

const POSITIVE_COMMENTS = [
  'Fast and helpful, thank you!',
  'Issue solved quickly. Great support.',
  'Very clear instructions, worked on the first try.',
  'Thanks for the quick fix!',
];

const NEUTRAL_COMMENTS = [
  'Solved, but it took a while.',
  'It works now, instructions could be clearer.',
];

const NEGATIVE_COMMENTS = [
  'Took several days to resolve.',
  'Solution works but the process was frustrating.',
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const { rows: tickets } = await pool.query(
    `SELECT id, created_by, COALESCE(closed_at, resolved_at) AS completed_at
     FROM tickets
     WHERE status IN ('resolved','closed')
       AND COALESCE(closed_at, resolved_at) IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM ticket_feedback f WHERE f.ticket_id = tickets.id)
     ORDER BY random()`
  );

  const selected = tickets.slice(0, Math.ceil(tickets.length * 0.6));
  let inserted = 0;

  for (const ticket of selected) {
    const roll = Math.random();
    const rating = roll < 0.7 ? 'positive' : roll < 0.9 ? 'neutral' : 'negative';
    const comment =
      rating === 'positive' ? pick(POSITIVE_COMMENTS)
        : rating === 'neutral' ? pick(NEUTRAL_COMMENTS)
          : pick(NEGATIVE_COMMENTS);

    const createdAt = new Date(
      new Date(ticket.completed_at).getTime() + randomInt(1, 48) * 3600000
    );

    await pool.query(
      `INSERT INTO ticket_feedback (ticket_id, rating, comment, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ticket_id) DO NOTHING`,
      [ticket.id, rating, comment, ticket.created_by, createdAt]
    );
    inserted += 1;
  }

  const csat = await pool.query(
    `SELECT rating, count(*)::int AS count FROM ticket_feedback GROUP BY rating ORDER BY rating`
  );
  console.log(`seeded ${inserted} feedback rows`);
  console.log('csat: ' + csat.rows.map((r) => `${r.rating}=${r.count}`).join(', '));

  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
