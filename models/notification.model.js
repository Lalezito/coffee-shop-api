// This is a placeholder for a Notification model
// In a real application, you would define a schema using Mongoose or another ORM
// to store notification history

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    index: true
  },
  additionalData: {
    type: Object
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  isGlobal: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
