// controllers/notificationController.js
const notificationService = require('../services/notificationService');

exports.getNotificationPreferences = async (req, res) => {
  try {
    const preferences = await notificationService.getNotificationPreferences(req.params.userId);
    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error al obtener preferencias de notificación:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error al obtener preferencias de notificación'
    });
  }
};

exports.saveNotificationPreferences = async (req, res) => {
  try {
    const result = await notificationService.saveNotificationPreferences(req.body);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Preferencias guardadas correctamente'
    });
  } catch (error) {
    console.error('Error al guardar preferencias de notificación:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error al guardar preferencias de notificación'
    });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    await notificationService.deleteAllNotifications(req.params.userId);
    res.status(200).json({
      success: true,
      message: 'Todas las notificaciones han sido eliminadas'
    });
  } catch (error) {
    console.error('Error al eliminar notificaciones:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error al eliminar notificaciones'
    });
  }
};
