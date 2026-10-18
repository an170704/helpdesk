const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const kbController = require('./kb.controller');

const router = Router();

router.use(authenticate);

router.get('/', kbController.listArticles);
router.get('/all', requireRole('admin', 'technician'), kbController.listAllArticles);
router.post('/', requireRole('admin', 'technician'), kbController.createArticle);
router.get('/:id', kbController.getArticle);
router.patch('/:id', requireRole('admin', 'technician'), kbController.updateArticle);
router.delete('/:id', requireRole('admin', 'technician'), kbController.deleteArticle);

module.exports = router;
