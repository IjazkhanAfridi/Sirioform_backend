const Notification = require('../models/Notification');

const createNotification = async ({ message, senderId, isAdmin = false }) => {
  try {
    const notification = new Notification({
      message,
      senderId,
      isAdmin,
    });

    await notification.save();
    return notification;
  } catch (error) {
    throw new Error('Failed to create notification: ' + error.message);
  }
};

module.exports = {
  createNotification,
};