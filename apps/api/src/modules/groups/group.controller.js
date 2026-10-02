const groupService = require('./group.service');

async function listGroups(req, res) {
  const groups = await groupService.findAll();
  res.json({ groups });
}

module.exports = { listGroups };
