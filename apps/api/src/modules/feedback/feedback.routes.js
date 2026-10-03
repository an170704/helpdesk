const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const feedbackController = require('./feedback.controller');

const router = Router();

router.use(authenticate);

router.post('/:id/feedback', feedbackController.createFeedback);

module.exports = router;
