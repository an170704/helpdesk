const AppError = require('../../utils/AppError');
const categoryService = require('../categories/category.service');
const groupService = require('../groups/group.service');
const kbService = require('./kb.service');

function plainText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function validateArticleInput(body) {
  const title = (body.title || '').trim();
  const content = String(body.content || '').trim();

  if (!title) {
    throw new AppError(400, 'title is required');
  }
  if (title.length > 255) {
    throw new AppError(400, 'title must not exceed 255 characters');
  }
  if (!plainText(content)) {
    throw new AppError(400, 'content is required');
  }
  if (content.length > 50000) {
    throw new AppError(400, 'content is too long');
  }

  return { title, content, isPublished: body.is_published === true };
}

async function resolveCategory(categoryId) {
  if (categoryId == null || categoryId === '') return null;

  if (!/^\d+$/.test(String(categoryId))) {
    throw new AppError(400, 'Invalid category_id');
  }

  const found = await categoryService.findById(Number(categoryId));
  if (!found) {
    throw new AppError(404, 'Category not found');
  }
  return found;
}

async function resolveGroup(groupId) {
  if (groupId == null || groupId === '') return null;

  if (!/^\d+$/.test(String(groupId))) {
    throw new AppError(400, 'Invalid group_id');
  }

  const found = await groupService.findById(Number(groupId));
  if (!found) {
    throw new AppError(404, 'Group not found');
  }
  return found.id;
}

// A category implies its group; a bare group is allowed (group-level classification)
async function resolveClassification(body) {
  const category = await resolveCategory(body.category_id);
  if (category) {
    return { categoryId: category.id, groupId: category.group_id };
  }

  const groupId = await resolveGroup(body.group_id);
  return { categoryId: null, groupId };
}

async function listArticles(req, res) {
  const articles = await kbService.findAllPublished();
  res.json({ articles });
}

async function listAllArticles(req, res) {
  const articles = await kbService.findAllAdmin();
  res.json({ articles });
}

async function getArticle(req, res) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }

  const article = await kbService.findById(id, req.user.role === 'admin');
  if (!article) {
    throw new AppError(404, 'Article not found');
  }
  res.json({ article });
}

async function createArticle(req, res) {
  const input = validateArticleInput(req.body || {});
  const { categoryId, groupId } = await resolveClassification(req.body || {});

  const id = await kbService.create({
    title: input.title,
    content: input.content,
    categoryId,
    groupId,
    isPublished: input.isPublished,
    authorId: req.user.id,
  });

  const article = await kbService.findById(id, true);
  res.status(201).json({ article });
}

async function updateArticle(req, res) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }

  const existing = await kbService.findById(id, true);
  if (!existing) {
    throw new AppError(404, 'Article not found');
  }

  const input = validateArticleInput(req.body || {});
  const { categoryId, groupId } = await resolveClassification(req.body || {});

  await kbService.update(id, {
    title: input.title,
    content: input.content,
    categoryId,
    groupId,
    isPublished: input.isPublished,
  });

  const article = await kbService.findById(id, true);
  res.json({ article });
}

async function deleteArticle(req, res) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }

  const removed = await kbService.remove(id);
  if (!removed) {
    throw new AppError(404, 'Article not found');
  }
  res.status(204).end();
}

module.exports = {
  listArticles,
  listAllArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
};
