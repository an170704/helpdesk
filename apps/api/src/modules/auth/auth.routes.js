const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const authController = require('./auth.controller');

const router = Router();

router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
