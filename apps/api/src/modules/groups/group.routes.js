const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const groupController = require('./group.controller');

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', groupController.listGroups);

module.exports = router;
