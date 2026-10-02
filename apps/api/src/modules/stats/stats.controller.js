const statsService = require('./stats.service');

async function getStats(req, res) {
  const stats = await statsService.getStats();
  res.json({ stats });
}

module.exports = { getStats };
