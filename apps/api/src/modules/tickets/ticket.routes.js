const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const ticketController = require('./ticket.controller');

const router = Router();

router.use(authenticate);

router.post('/', ticketController.createTicket);
router.get('/', ticketController.listTickets);
router.get('/:id', ticketController.getTicket);
router.get('/:id/history', ticketController.listHistory);
router.patch('/:id/status', requireRole('admin', 'technician'), ticketController.updateStatus);
router.patch('/:id/priority', requireRole('admin'), ticketController.updatePriority);
router.patch('/:id/assign', requireRole('admin'), ticketController.assignTicket);
router.delete('/:id', requireRole('admin'), ticketController.deleteTicket);

module.exports = router;
