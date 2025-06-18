const OneSignal = require('onesignal-node');
require('dotenv').config();

const client = new OneSignal.Client(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_REST_API_KEY);

class OneSignalService {
  async sendNotificationToUser(userId, title, content, additionalData = {}) {
    try {
      const notification = {
  include_external_user_ids: [userId],
  headings: { en: title },
  contents: { en: content },
  data: additionalData
};
const response = await client.createNotification(notification);
return {
  success: true,
  message: 'Notification sent successfully',
  data: response.body
};
    } catch (error) {
      console.error('Error sending notification:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to send notification',
        error: error.response?.data || error.message
      };
    }
  }

  async sendGlobalNotification(title, content, additionalData = {}) {
    try {
      const notification = {
  included_segments: ['Subscribed Users'],
  headings: { en: title },
  contents: { en: content },
  data: additionalData
};
const response = await client.createNotification(notification);
return {
  success: true,
  message: 'Global notification sent successfully',
  data: response.body
};
    } catch (error) {
      console.error('Error sending global notification:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to send global notification',
        error: error.response?.data || error.message
      };
    }
  }

  async registerDevice(userId, playerId, email) {
    try {
      // Note: OneSignal Node SDK doesn't have a direct method for registering players
// This would typically be handled client-side or through a different approach
// For now, we'll return a placeholder success
return {
  success: true,
  message: 'Device registration not implemented in backend SDK',
  data: { userId, playerId, email }
};
    } catch (error) {
      console.error('Error registering device:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to register device',
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new OneSignalService();
