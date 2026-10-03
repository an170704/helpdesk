const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const statsController = require('./stats.controller');

const router = Router();

router.use(authenticate);

router.get('/me', requireRole('technician'), statsController.getMyStats);
router.get('/', requireRole('admin'), statsController.getStats);

module.exports = router;
