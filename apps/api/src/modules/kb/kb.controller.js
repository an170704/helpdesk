const AppError = require('../../utils/AppError');
const kbService = require('./kb.service');

async function listArticles(req, res) {
  const articles = await kbService.findAllPublished();
  res.json({ articles });
}

async function getArticle(req, res) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }

  const article = await kbService.findByIdPublished(id);
  if (!article) {
    throw new AppError(404, 'Article not found');
  }
  res.json({ article });
}

module.exports = { listArticles, getArticle };
