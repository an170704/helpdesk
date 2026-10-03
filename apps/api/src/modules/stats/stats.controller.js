const statsService = require('./stats.service');

async function getStats(req, res) {
  const stats = await statsService.getStats();
  res.json({ stats });
}

async function getMyStats(req, res) {
  const stats = await statsService.getMyStats(req.user.id);
  res.json({ stats });
}

module.exports = { getStats, getMyStats };
