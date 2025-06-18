const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  name: { // e.g., "Welcome Email", "Order Confirmation"
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  subject: { // For email notifications, or a short title
    type: String,
    required: true,
    trim: true
  },
  body: { // The main content of the notification, can support placeholders
    type: String,
    required: true
  },
  type: { // e.g., 'email', 'sms', 'push' - helps in processing
    type: String,
    required: true,
    enum: ['email', 'sms', 'push', 'in_app'],
    default: 'push'
  },
  tags: [{ // For categorization and searching
    type: String,
    trim: true
  }],
  placeholders: [{ // List of expected placeholder variables, e.g., {{userName}}, {{orderId}}
    name: String,
    description: String,
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  // TODO: IMPLEMENTAR REALMENTE - Add any other fields relevant for templates
  // e.g., versioning, language support, etc.
}, {
  timestamps: true
});

notificationTemplateSchema.index({ name: 1 });
notificationTemplateSchema.index({ type: 1 });
notificationTemplateSchema.index({ tags: 1 });

const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);

module.exports = NotificationTemplate;
