const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const groupController = require('./group.controller');

const router = Router();

router.use(authenticate);

router.get('/options', groupController.listGroupOptions);

router.use(requireRole('admin'));

router.get('/', groupController.listGroups);
router.post('/', groupController.createGroup);
router.get('/:id', groupController.getGroup);
router.patch('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);
router.put('/:id/members', groupController.setMembers);
router.post('/:id/members', groupController.addMembers);
router.delete('/:id/members/:userId', groupController.removeMember);

module.exports = router;
