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
    groupResult,
    priorityResult,
    monthResult,
    techResult,
    requesterResult,
    firstResponseResult,
    slaResult,
    csatResult,
    unresolvedCategoryResult,
  ] = await Promise.all([
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status IN ('pending','in_progress'))::int AS unresolved,
              count(*) FILTER (WHERE status = 'in_progress')::int AS open,
              count(*) FILTER (WHERE assigned_to IS NULL AND status IN ('pending','in_progress'))::int AS unassigned,
              count(*) FILTER (WHERE due_at::date = CURRENT_DATE AND status NOT IN ('resolved','closed'))::int AS due_today,
              count(*) FILTER (WHERE due_at < now() AND status NOT IN ('resolved','closed'))::int AS overdue,
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
    pool.query(
      `SELECT COALESCE(g.name, 'No group') AS name, count(*)::int AS count
       FROM tickets t
       LEFT JOIN groups g ON g.id = t.group_id
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
    pool.query(
      `SELECT round(avg(EXTRACT(EPOCH FROM (first_start - created_at)) / 3600)::numeric, 1)
                AS avg_first_response_hours
       FROM (
         SELECT t.id, t.created_at, min(h.created_at) AS first_start
         FROM tickets t
         JOIN ticket_history h
           ON h.ticket_id = t.id AND h.action = 'status_changed' AND h.to_status = 'in_progress'
         GROUP BY t.id
       ) first`
    ),
    pool.query(
      `SELECT round(100.0 * count(*) FILTER (WHERE completed_at <= due_at) / NULLIF(count(*), 0))::int
                AS sla_percent
       FROM (
         SELECT COALESCE(closed_at, resolved_at) AS completed_at, due_at
         FROM tickets
         WHERE status IN ('resolved','closed')
           AND due_at IS NOT NULL
           AND COALESCE(closed_at, resolved_at) IS NOT NULL
       ) done`
    ),
    pool.query(`SELECT rating, count(*)::int AS count FROM ticket_feedback GROUP BY rating`),
    pool.query(
      `SELECT COALESCE(p.name, c.name, 'Unclassified') AS name, count(*)::int AS count
       FROM tickets t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE t.status IN ('pending','in_progress')
       GROUP BY 1 ORDER BY 2 DESC`
    ),
  ]);

  const monthMap = Object.fromEntries(monthResult.rows.map((r) => [r.month, r]));
  const byMonth = lastMonthLabels(6).map(
    (month) => monthMap[month] || { month, pending: 0, in_progress: 0, resolved: 0, closed: 0 }
  );

  const csat = { positive: 0, neutral: 0, negative: 0, total: 0 };
  for (const row of csatResult.rows) {
    csat[row.rating] = row.count;
    csat.total += row.count;
  }

  return {
    summary: summaryResult.rows[0],
    avgFirstResponseHours: firstResponseResult.rows[0].avg_first_response_hours,
    slaPercent: slaResult.rows[0].sla_percent,
    csat,
    unresolvedByCategory: unresolvedCategoryResult.rows,
    byStatus: statusResult.rows,
    byCategory: categoryResult.rows,
    byGroup: groupResult.rows,
    byPriority: priorityResult.rows,
    byMonth,
    byTechnician: techResult.rows,
    topRequesters: requesterResult.rows,
  };
}

async function getMyStats(userId) {
  const [ticketsResult, csatResult] = await Promise.all([
    pool.query(
      `SELECT count(*) FILTER (WHERE status IN ('pending','in_progress'))::int AS open,
              count(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
              count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
              count(*) FILTER (WHERE status = 'closed')::int AS closed,
              count(*)::int AS total
       FROM tickets WHERE assigned_to = $1`,
      [userId]
    ),
    pool.query(
      `SELECT f.rating, count(*)::int AS count
       FROM ticket_feedback f
       JOIN tickets t ON t.id = f.ticket_id
       WHERE t.assigned_to = $1
       GROUP BY f.rating`,
      [userId]
    ),
  ]);

  const csat = { positive: 0, neutral: 0, negative: 0, total: 0 };
  for (const row of csatResult.rows) {
    csat[row.rating] = row.count;
    csat.total += row.count;
  }
  csat.positivePercent = csat.total ? Math.round((csat.positive / csat.total) * 100) : null;

  return { tickets: ticketsResult.rows[0], csat };
}

module.exports = { getStats, getMyStats };
