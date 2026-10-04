const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const userController = require('./user.controller');

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

router.use(requireRole('admin'));

router.get('/', userController.listUsers);
router.get('/technicians', userController.listTechnicians);
router.post('/', userController.createUser);
router.get('/:id', userController.getUser);
router.get('/:id/overview', userController.getUserOverview);
router.patch('/:id', userController.updateUser);
router.post('/:id/reset-password', userController.resetPassword);

module.exports = router;
