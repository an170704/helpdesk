const express = require('express');
const path = require('path');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./modules/auth/auth.routes');
const ticketRoutes = require('./modules/tickets/ticket.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'error', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Không tìm thấy tài nguyên' });
});

app.use((err, req, res, next) => {
  if (!err.status || err.status >= 500) {
    console.error(err);
  }
  res.status(err.status || 500).json({ message: err.message || 'Lỗi máy chủ' });
});

module.exports = app;
