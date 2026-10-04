const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const categoryController = require('./category.controller');

const router = Router();

router.use(authenticate);

router.get('/', categoryController.listCategories);
router.post('/', requireRole('admin'), categoryController.createCategory);
router.delete('/:id', requireRole('admin'), categoryController.deleteCategory);

module.exports = router;
