const User = require('../models/user.model');
const ClerkService = require('../services/clerk.service');
const Sentry = require('@sentry/node');
const { validationResult } = require('express-validator');

/**
 * Obtener preferencias de notificaciones del usuario
 */
exports.getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.userId;

    // Buscar usuario en nuestra base de datos
    let user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Intentar obtener metadatos desde Clerk para mantener la consistencia
    const clerkData = await ClerkService.getUserMetadata(userId);
    
    let notificationPreferences = {};
    
    // Si hay metadatos de notificaciones en Clerk, usarlos como fuente de verdad
    if (clerkData.success && clerkData.metadata && clerkData.metadata.notification_preferences) {
      notificationPreferences = clerkData.metadata.notification_preferences;
      
      // Actualizar perfil en nuestra DB si es necesario para mantener sincronía
      if (!user.notificationPreferences || 
          JSON.stringify(user.notificationPreferences) !== JSON.stringify(notificationPreferences)) {
        user.notificationPreferences = notificationPreferences;
        await user.save();
      }
    } else {
      // Si no hay datos en Clerk pero sí en nuestra DB, usamos nuestra DB
      notificationPreferences = user.notificationPreferences || {
        promotional: true,
        order_status: true,
        special_offers: true,
        newsletter: false
      };
      
      // Sincronizar con Clerk para futuros accesos
      await ClerkService.updateUserMetadata(userId, {
        notification_preferences: notificationPreferences
      });
    }

    res.status(200).json({
      success: true,
      preferences: notificationPreferences
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener preferencias de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener preferencias de notificaciones',
      error: error.message
    });
  }
};

/**
 * Actualizar una preferencia específica de notificaciones
 */
exports.updateNotificationPreference = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const userId = req.user.sub || req.user.userId;
    const { topic, enabled } = req.body;

    // Validar el topic 
    const validTopics = ['promotional', 'order_status', 'special_offers', 'newsletter'];
    if (!validTopics.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: `Topic inválido. Debe ser uno de: ${validTopics.join(', ')}`
      });
    }

    // Buscar usuario en nuestra base de datos
    let user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar la preferencia en nuestra DB
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        promotional: true,
        order_status: true,
        special_offers: true,
        newsletter: false
      };
    }
    
    user.notificationPreferences[topic] = enabled;
    await user.save();

    // Sincronizar con Clerk
    await ClerkService.updateUserMetadata(userId, {
      notification_preferences: user.notificationPreferences
    });

    res.status(200).json({
      success: true,
      message: `Preferencia ${topic} actualizada correctamente`,
      preferences: user.notificationPreferences
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al actualizar preferencia de notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar preferencia de notificación',
      error: error.message
    });
  }
};

/**
 * Actualizar todas las preferencias de notificaciones de una vez
 */
exports.updateAllNotificationPreferences = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const userId = req.user.sub || req.user.userId;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un objeto de preferencias válido'
      });
    }

    // Validar el objeto de preferencias
    const validTopics = ['promotional', 'order_status', 'special_offers', 'newsletter'];
    const invalidTopics = Object.keys(preferences).filter(key => !validTopics.includes(key));
    
    if (invalidTopics.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Topics inválidos: ${invalidTopics.join(', ')}. Los válidos son: ${validTopics.join(', ')}`
      });
    }

    // Buscar usuario en nuestra base de datos
    let user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar las preferencias en nuestra DB manteniendo valores existentes
    user.notificationPreferences = {
      ...user.notificationPreferences || {
        promotional: true,
        order_status: true,
        special_offers: true,
        newsletter: false
      },
      ...preferences
    };
    
    await user.save();

    // Sincronizar con Clerk
    await ClerkService.updateUserMetadata(userId, {
      notification_preferences: user.notificationPreferences
    });

    res.status(200).json({
      success: true,
      message: 'Preferencias de notificaciones actualizadas correctamente',
      preferences: user.notificationPreferences
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al actualizar preferencias de notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar preferencias de notificaciones',
      error: error.message
    });
  }
};
