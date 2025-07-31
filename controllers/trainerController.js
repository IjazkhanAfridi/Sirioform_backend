const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/emailService');
const axios = require('axios');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationService');

exports.getAllTrainer = async (req, res) => {
  try {
    const trainers = await User.find({ role: 'trainer' }).populate(
      'sanitarios'
    );
    res.json(trainers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
