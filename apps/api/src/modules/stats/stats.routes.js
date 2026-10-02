const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const statsController = require('./stats.controller');

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', statsController.getStats);

module.exports = router;
