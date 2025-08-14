const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cron = require('node-cron');
// const { runExpirationReminderJob } = require('./utils/expirationReminderService');
// const maintenanceRoutes = require('./routes/maintenanceRoutes');

require('dotenv').config();

connectDB();
const app = express();

const _dirname = path.dirname('');
const buildpath = path.join(_dirname, '../frontend/dist');
app.use(express.static(buildpath));
app.use('/uploads', express.static('uploads'));
app.use(cors());
app.use(bodyParser.json());

const REMINDER_CRON = process.env.REMINDER_CRON || '0 8 * * *';
cron.schedule(REMINDER_CRON, async () => {
  console.log('[CRON] Expiration reminder job started');
  try {
    await runExpirationReminderJob();
    console.log('[CRON] Expiration reminder job finished');
  } catch (e) {
    console.error('[CRON] Expiration reminder job failed:', e.message);
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/centers', require('./routes/centers'));
app.use('/api/sirioform', require('./routes/sirioformRoutes'));
app.use('/api/trainer', require('./routes/trainerRoute'));
app.use('/api/instructors', require('./routes/instructors'));
app.use('/api', require('./routes/protected'));
app.use('/api/kits', require('./routes/kits'));
app.use('/api/sanitarios', require('./routes/sanitarios'));

app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/communication', require('./routes/communicationRoutes'));
app.use('/api/document', require('./routes/documentRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/discenti', require('./routes/discenteRoutes'));
app.use('/api/corsi', require('./routes/courseRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/patent-updates', require('./routes/patentUpdateRoutes'));

// app.use('/api/maintenance', maintenanceRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.resolve(_dirname, '../frontend/dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
