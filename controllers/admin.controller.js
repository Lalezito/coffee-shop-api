const OneSignalService = require('../services/onesignal.service');

class AdminController {
  async sendGlobalNotification(req, res) {
    const { title, content, additionalData } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'title and content are required'
      });
    }

    // Check if user is admin (assuming auth middleware sets req.user)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
    }

    const result = await OneSignalService.sendGlobalNotification(title, content, additionalData);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }

  async getNotificationHistory(req, res) {
    // This would normally fetch from a database
    // For now, we'll return a placeholder response
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
    }

    // Placeholder response
    res.status(200).json({
      success: true,
      data: {
        notifications: [],
        pagination: {
          currentPage: page,
          totalPages: 1,
          limit: limit,
          totalItems: 0
        }
      }
    });
  }
}

module.exports = new AdminController();
