const TICKET_STATUSES = ['pending', 'in_progress', 'resolved', 'closed'];

const ALLOWED_TRANSITIONS = {
  pending: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

module.exports = { TICKET_STATUSES, ALLOWED_TRANSITIONS };
