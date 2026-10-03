const TICKET_STATUSES = ['pending', 'in_progress', 'resolved', 'closed'];

const TICKET_PRIORITIES = ['low', 'medium', 'high'];

const SLA_HOURS = { low: 72, medium: 24, high: 8 };

const ALLOWED_TRANSITIONS = {
  pending: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

module.exports = { TICKET_STATUSES, TICKET_PRIORITIES, SLA_HOURS, ALLOWED_TRANSITIONS };
