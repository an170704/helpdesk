const pool = require('../../config/db');

function lastMonthLabels(count) {
  const months = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

async function getStats() {
  const [
    summaryResult,
    statusResult,
    categoryResult,
    priorityResult,
    monthResult,
    techResult,
    requesterResult,
  ] = await Promise.all([
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status IN ('pending','in_progress'))::int AS open,
              count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
              count(*) FILTER (WHERE status = 'closed')::int AS closed,
              round(avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
                    FILTER (WHERE resolved_at IS NOT NULL))::int AS avg_resolution_hours
       FROM tickets`
    ),
    pool.query(`SELECT status, count(*)::int AS count FROM tickets GROUP BY status`),
    pool.query(
      `SELECT COALESCE(p.name, c.name, 'Unclassified') AS name, count(*)::int AS count
       FROM tickets t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN categories p ON p.id = c.parent_id
       GROUP BY 1 ORDER BY 2 DESC`
    ),
    pool.query(`SELECT priority, count(*)::int AS count FROM tickets GROUP BY priority`),
    pool.query(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
              count(*) FILTER (WHERE status = 'pending')::int AS pending,
              count(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
              count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
              count(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM tickets
       WHERE created_at >= date_trunc('month', now()) - interval '5 months'
       GROUP BY 1 ORDER BY 1`
    ),
    pool.query(
      `SELECT u.full_name AS name, count(*)::int AS count
       FROM tickets t JOIN users u ON u.id = t.assigned_to
       GROUP BY 1 ORDER BY 2 DESC`
    ),
    pool.query(
      `SELECT u.full_name AS name, count(*)::int AS count
       FROM tickets t JOIN users u ON u.id = t.created_by
       GROUP BY 1 ORDER BY 2 DESC LIMIT 5`
    ),
  ]);

  const monthMap = Object.fromEntries(monthResult.rows.map((r) => [r.month, r]));
  const byMonth = lastMonthLabels(6).map(
    (month) => monthMap[month] || { month, pending: 0, in_progress: 0, resolved: 0, closed: 0 }
  );

  return {
    summary: summaryResult.rows[0],
    byStatus: statusResult.rows,
    byCategory: categoryResult.rows,
    byPriority: priorityResult.rows,
    byMonth,
    byTechnician: techResult.rows,
    topRequesters: requesterResult.rows,
  };
}

module.exports = { getStats };
