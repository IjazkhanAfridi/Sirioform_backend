const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { runExpirationReminderJob } = require('../utils/expirationReminderService');

router.post('/run-expiration-reminders', auth, isAdmin, async (req, res) => {
  try {
    await runExpirationReminderJob();
    res.status(200).json({ message: 'Reminder job executed' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to run reminder job', error: e.message });
  }
});

module.exports = router;