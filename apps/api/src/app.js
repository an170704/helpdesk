const express = require('express');
const path = require('path');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./modules/auth/auth.routes');
const ticketRoutes = require('./modules/tickets/ticket.routes');
const attachmentRoutes = require('./modules/attachments/attachment.routes');
const groupRoutes = require('./modules/groups/group.routes');
const userRoutes = require('./modules/users/user.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const commentRoutes = require('./modules/comments/comment.routes');
const kbRoutes = require('./modules/kb/kb.routes');
const statsRoutes = require('./modules/stats/stats.routes');
const settingRoutes = require('./modules/settings/setting.routes');
const feedbackRoutes = require('./modules/feedback/feedback.routes');
const uploadRoutes = require('./modules/uploads/upload.routes');
const categoryRoutes = require('./modules/categories/category.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'error', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/tickets', attachmentRoutes);
app.use('/api/tickets', commentRoutes);
app.use('/api/tickets', feedbackRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/categories', categoryRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

app.use((err, req, res, next) => {
  if (!err.status || err.status >= 500) {
    console.error(err);
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
