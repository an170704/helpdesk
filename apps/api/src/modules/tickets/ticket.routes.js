const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const ticketController = require('./ticket.controller');

const router = Router();

router.use(authenticate);

router.post('/', ticketController.createTicket);
router.get('/', ticketController.listTickets);
router.get('/:id', ticketController.getTicket);
router.get('/:id/history', ticketController.listHistory);
router.patch('/:id/status', requireRole('admin'), ticketController.updateStatus);

module.exports = router;
