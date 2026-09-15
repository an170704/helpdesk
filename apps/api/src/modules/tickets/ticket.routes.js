const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const ticketController = require('./ticket.controller');

const router = Router();

router.use(authenticate);

router.post('/', ticketController.createTicket);
router.get('/', ticketController.listTickets);
router.get('/:id', ticketController.getTicket);

module.exports = router;
