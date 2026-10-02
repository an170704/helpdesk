const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const kbController = require('./kb.controller');

const router = Router();

router.use(authenticate);

router.get('/', kbController.listArticles);
router.get('/:id', kbController.getArticle);

module.exports = router;
