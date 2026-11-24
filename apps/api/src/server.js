require('dotenv').config();
const app = require('./app');
const ticketService = require('./modules/tickets/ticket.service');

const PORT = process.env.PORT || 3000;
const ESCALATION_INTERVAL_MS = 5 * 60 * 1000;

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});

async function runOverdueEscalation() {
  try {
    const tickets = await ticketService.escalateOverdueTickets();
    if (tickets.length) {
      console.log(`Escalated ${tickets.length} overdue ticket(s)`);
    }
  } catch (err) {
    console.error('Overdue escalation failed:', err.message);
  }
}

// Catch tickets that became overdue while the server was idle, then poll periodically.
setTimeout(runOverdueEscalation, 15000);
setInterval(runOverdueEscalation, ESCALATION_INTERVAL_MS);
