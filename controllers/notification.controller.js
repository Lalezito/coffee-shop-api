const OneSignalService = require('../services/onesignal.service');

class NotificationController {
  async registerDevice(req, res) {
    const { userId, playerId, email } = req.body;
    
    if (!userId || !playerId) {
      return res.status(400).json({
        success: false,
        message: 'userId and playerId are required'
      });
    }

    const result = await OneSignalService.registerDevice(userId, playerId, email);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }

  async sendToUser(req, res) {
    const { userId, title, content, additionalData } = req.body;
    
    if (!userId || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'userId, title, and content are required'
      });
    }

    const result = await OneSignalService.sendNotificationToUser(userId, title, content, additionalData);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }

  async sendOrderStatus(req, res) {
    const { orderId, newStatus, userIds } = req.body;
    
    if (!orderId || !newStatus || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'orderId, newStatus, and userIds (as an array) are required'
      });
    }

    const title = 'Order Status Update';
    const content = `Your order #${orderId} is now ${newStatus}.`;
    const additionalData = { orderId, newStatus };
    
    // For simplicity, we'll send to the first userId in the array
    // In a real app, you might want to send to multiple users
    const result = await OneSignalService.sendNotificationToUser(userIds[0], title, content, additionalData);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }
}

module.exports = new NotificationController();
