const AppError = require('../../utils/AppError');
const categoryService = require('./category.service');

async function listCategories(req, res) {
  const categories = await categoryService.findAll();
  res.json({ categories });
}

async function createCategory(req, res) {
  const name = (req.body && req.body.name ? String(req.body.name) : '').trim();
  if (!name) {
    throw new AppError(400, 'name is required');
  }
  if (name.length > 100) {
    throw new AppError(400, 'name must not exceed 100 characters');
  }

  let groupId = null;
  if (req.body.group_id != null && req.body.group_id !== '') {
    if (!/^\d+$/.test(String(req.body.group_id))) {
      throw new AppError(400, 'Invalid group_id');
    }
    groupId = Number(req.body.group_id);
  }

  const description = req.body && req.body.description ? String(req.body.description).trim() : null;
  const category = await categoryService.create({ name, description, groupId });
  res.status(201).json({ category });
}

async function deleteCategory(req, res) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }

  await categoryService.remove(Number(id));
  res.status(204).end();
}

module.exports = { listCategories, createCategory, deleteCategory };
