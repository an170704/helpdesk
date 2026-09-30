const TICKET_STATUSES = ['pending', 'in_progress', 'resolved', 'closed'];

const TICKET_PRIORITIES = ['low', 'medium', 'high'];

const ALLOWED_TRANSITIONS = {
  pending: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

module.exports = { TICKET_STATUSES, TICKET_PRIORITIES, ALLOWED_TRANSITIONS };
