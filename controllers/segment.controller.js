const SegmentationService = require('../services/segmentation.service');
const { validationResult } = require('express-validator');

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  Sentry = {
    captureException: (err) => console.error('Sentry no disponible:', err)
  };
}

/**
 * Obtener todos los segmentos
 */
exports.getSegments = async (req, res) => {
  try {
    // Extraer opciones de filtrado desde la query
    const { active, tags } = req.query;
    const options = {};
    
    if (active !== undefined) {
      options.active = active === 'true';
    }
    
    if (tags) {
      options.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }
    
    const segments = await SegmentationService.getSegments(options);
    
    res.status(200).json({
      success: true,
      data: {
        segments,
        count: segments.length
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener segmentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener segmentos',
      error: error.message
    });
  }
};

/**
 * Obtener un segmento específico por nombre
 */
exports.getSegment = async (req, res) => {
  try {
    const { segmentName } = req.params;
    const segment = await SegmentationService.getSegmentByName(segmentName);
    
    res.status(200).json({
      success: true,
      data: { segment }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al obtener segmento '${req.params.segmentName}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener segmento',
      error: error.message
    });
  }
};

/**
 * Crear un nuevo segmento
 */
exports.createSegment = async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const segmentData = req.body;
    const segment = await SegmentationService.createSegment(segmentData);
    
    res.status(201).json({
      success: true,
      message: 'Segmento creado exitosamente',
      data: { segment }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al crear segmento:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    // Manejar errores de duplicación
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un segmento con ese nombre'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear segmento',
      error: error.message
    });
  }
};

/**
 * Actualizar un segmento existente
 */
exports.updateSegment = async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { segmentId } = req.params;
    const updateData = req.body;
    
    const segment = await SegmentationService.updateSegment(segmentId, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Segmento actualizado exitosamente',
      data: { segment }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al actualizar segmento '${req.params.segmentId}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar segmento',
      error: error.message
    });
  }
};

/**
 * Eliminar un segmento
 */
exports.deleteSegment = async (req, res) => {
  try {
    const { segmentId } = req.params;
    await SegmentationService.deleteSegment(segmentId);
    
    res.status(200).json({
      success: true,
      message: 'Segmento eliminado exitosamente'
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al eliminar segmento '${req.params.segmentId}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al eliminar segmento',
      error: error.message
    });
  }
};

/**
 * Obtener usuarios que pertenecen a un segmento
 */
exports.getSegmentUsers = async (req, res) => {
  try {
    const { segmentName } = req.params;
    const { fields } = req.query;
    
    // Opciones de campos a seleccionar
    const options = {};
    if (fields) {
      options.fields = fields.split(',').join(' ');
    }
    
    const users = await SegmentationService.getUsersInSegment(segmentName, options);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al obtener usuarios del segmento '${req.params.segmentName}':`, error);
    
    if (error.message.includes('no encontrado') || error.message.includes('no está activo')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios del segmento',
      error: error.message
    });
  }
};

/**
 * Actualizar la estimación de tamaño de un segmento
 */
exports.updateSegmentSize = async (req, res) => {
  try {
    const { segmentId } = req.params;
    const size = await SegmentationService.updateSegmentSize(segmentId);
    
    res.status(200).json({
      success: true,
      message: 'Tamaño de segmento actualizado',
      data: { size }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al actualizar tamaño del segmento '${req.params.segmentId}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar tamaño del segmento',
      error: error.message
    });
  }
};

/**
 * Ejecutar el proceso de segmentación para todos los segmentos activos
 */
exports.runSegmentation = async (req, res) => {
  try {
    const results = await SegmentationService.runSegmentation();
    
    res.status(200).json({
      success: true,
      message: `Segmentación completada: ${results.processedSegments} segmentos procesados`,
      data: results
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al ejecutar segmentación:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al ejecutar segmentación',
      error: error.message
    });
  }
};

/**
 * Actualizar estadísticas analíticas de usuarios para segmentación
 */
exports.updateUserAnalytics = async (req, res) => {
  try {
    const results = await SegmentationService.updateUserAnalytics();
    
    res.status(200).json({
      success: true,
      message: `Analytics actualizados: ${results.updatedUsers} usuarios procesados`,
      data: results
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al actualizar analytics de usuarios:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar analytics de usuarios',
      error: error.message
    });
  }
};

/**
 * Obtener metadatos de segmentación (campos disponibles para reglas, etc.)
 */
exports.getSegmentationMetadata = async (req, res) => {
  try {
    // Organizar los campos disponibles para crear reglas de segmentación
    const metadata = {
      ruleTypes: [
        {
          id: 'demographic',
          label: 'Datos demográficos',
          fields: [
            { id: 'age', label: 'Edad', type: 'number' },
            { id: 'gender', label: 'Género', type: 'enum', values: ['male', 'female', 'other'] },
            { id: 'language', label: 'Idioma', type: 'string' },
            { id: 'country', label: 'País', type: 'string' },
            { id: 'city', label: 'Ciudad', type: 'string' },
            { id: 'registrationDate', label: 'Fecha de registro', type: 'date' }
          ]
        },
        {
          id: 'behavior',
          label: 'Comportamiento',
          fields: [
            { id: 'lastLogin', label: 'Último inicio de sesión', type: 'date' },
            { id: 'visits', label: 'Número de visitas', type: 'number' },
            { id: 'lastActive', label: 'Última actividad', type: 'date' },
            { id: 'loginCount', label: 'Cantidad de inicios de sesión', type: 'number' },
            { id: 'daysInactive', label: 'Días inactivo', type: 'number' }
          ]
        },
        {
          id: 'preference',
          label: 'Preferencias',
          fields: [
            { id: 'coffeeIntensity', label: 'Intensidad de café', type: 'number', min: 1, max: 5 },
            { id: 'coffeeSweetness', label: 'Dulzura preferida', type: 'number', min: 1, max: 5 },
            { id: 'milkRatio', label: 'Proporción de leche', type: 'number', min: 1, max: 5 },
            { id: 'promotional', label: 'Acepta promociones', type: 'boolean' },
            { id: 'orderStatus', label: 'Notificaciones de pedidos', type: 'boolean' },
            { id: 'specialOffers', label: 'Ofertas especiales', type: 'boolean' },
            { id: 'newsletter', label: 'Suscrito al newsletter', type: 'boolean' },
            { id: 'favoriteDrink', label: 'Bebida favorita', type: 'string' }
          ]
        },
        {
          id: 'purchase',
          label: 'Compras',
          fields: [
            { id: 'totalSpent', label: 'Gasto total', type: 'number' },
            { id: 'lastPurchaseDate', label: 'Fecha de última compra', type: 'date' },
            { id: 'orderValue', label: 'Valor promedio de orden', type: 'number' },
            { id: 'ordersCount', label: 'Número de órdenes', type: 'number' },
            { id: 'daysFromLastOrder', label: 'Días desde última orden', type: 'number' }
          ]
        },
        {
          id: 'engagement',
          label: 'Engagement',
          fields: [
            { id: 'appOpenCount', label: 'Aperturas de app', type: 'number' },
            { id: 'notificationClickRate', label: 'Tasa de clicks en notificaciones', type: 'number' },
            { id: 'productViewCount', label: 'Vistas de producto', type: 'number' },
            { id: 'cartAbandonment', label: 'Tasa de abandono de carrito', type: 'number' }
          ]
        },
        {
          id: 'device',
          label: 'Dispositivo',
          fields: [
            { id: 'platform', label: 'Plataforma', type: 'enum', values: ['ios', 'android', 'web'] },
            { id: 'deviceModel', label: 'Modelo de dispositivo', type: 'string' },
            { id: 'osVersion', label: 'Versión de OS', type: 'string' },
            { id: 'pushEnabled', label: 'Push habilitado', type: 'boolean' }
          ]
        }
      ],
      operators: [
        { id: 'equals', label: 'Igual a', applicableTypes: ['string', 'number', 'enum', 'boolean'] },
        { id: 'notEquals', label: 'Diferente de', applicableTypes: ['string', 'number', 'enum', 'boolean'] },
        { id: 'contains', label: 'Contiene', applicableTypes: ['string'] },
        { id: 'notContains', label: 'No contiene', applicableTypes: ['string'] },
        { id: 'greaterThan', label: 'Mayor que', applicableTypes: ['number', 'date'] },
        { id: 'lessThan', label: 'Menor que', applicableTypes: ['number', 'date'] },
        { id: 'between', label: 'Entre', applicableTypes: ['number', 'date'] },
        { id: 'in', label: 'Está en', applicableTypes: ['string', 'number', 'enum'] },
        { id: 'notIn', label: 'No está en', applicableTypes: ['string', 'number', 'enum'] },
        { id: 'exists', label: 'Existe', applicableTypes: ['string', 'number', 'enum', 'boolean', 'date'] },
        { id: 'notExists', label: 'No existe', applicableTypes: ['string', 'number', 'enum', 'boolean', 'date'] },
        { id: 'daysAgo', label: 'Hace X días', applicableTypes: ['date'] },
        { id: 'olderThanDays', label: 'Hace más de X días', applicableTypes: ['date'] }
      ]
    };
    
    res.status(200).json({
      success: true,
      data: metadata
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener metadatos de segmentación:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener metadatos de segmentación',
      error: error.message
    });
  }
};

/**
 * Obtener métricas detalladas de un segmento
 */
exports.getSegmentMetrics = async (req, res) => {
  try {
    const { segmentName } = req.params;
    
    // Obtener el segmento
    const segment = await SegmentationService.getSegmentByName(segmentName);
    
    // Obtener usuarios en el segmento
    const users = await SegmentationService.getUsersInSegment(segmentName);
    
    if (!users.length) {
      return res.status(200).json({
        success: true,
        message: `El segmento '${segmentName}' no tiene usuarios`,
        data: {
          segmentInfo: segment,
          userCount: 0,
          metrics: {}
        }
      });
    }
    
    // Calcular métricas sobre los usuarios
    const metrics = {};
    
    // Demográficas
    const genders = {};
    let totalAge = 0;
    let ageCount = 0;
    const cities = {};
    
    // Comportamiento
    let totalOrderCount = 0;
    let totalSpent = 0;
    let usersWithOrders = 0;
    let usersWithNotificationPrefs = 0;
    const notificationPreferences = {
      promotional: 0,
      order_status: 0,
      special_offers: 0,
      newsletter: 0
    };
    
    // Procesar datos
    users.forEach(user => {
      // Demográficas
      if (user.gender) {
        genders[user.gender] = (genders[user.gender] || 0) + 1;
      }
      
      if (user.age) {
        totalAge += user.age;
        ageCount++;
      }
      
      if (user.addresses && user.addresses.length > 0) {
        const primaryAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
        if (primaryAddress.city) {
          cities[primaryAddress.city] = (cities[primaryAddress.city] || 0) + 1;
        }
      }
      
      // Comportamiento
      if (user.analytics) {
        if (user.analytics.ordersCount) {
          totalOrderCount += user.analytics.ordersCount;
          usersWithOrders++;
        }
        
        if (user.analytics.totalSpent) {
          totalSpent += user.analytics.totalSpent;
        }
      }
      
      // Preferencias de notificaciones
      if (user.notificationPreferences) {
        usersWithNotificationPrefs++;
        
        if (user.notificationPreferences.promotional) {
          notificationPreferences.promotional++;
        }
        
        if (user.notificationPreferences.order_status) {
          notificationPreferences.order_status++;
        }
        
        if (user.notificationPreferences.special_offers) {
          notificationPreferences.special_offers++;
        }
        
        if (user.notificationPreferences.newsletter) {
          notificationPreferences.newsletter++;
        }
      }
    });
    
    // Formatear resultados
    metrics.demographics = {
      genderDistribution: genders,
      avgAge: ageCount > 0 ? Math.round(totalAge / ageCount) : null,
      topCities: Object.entries(cities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([city, count]) => ({ city, count, percentage: Math.round((count / users.length) * 100) }))
    };
    
    metrics.behavior = {
      avgOrdersPerUser: usersWithOrders > 0 ? (totalOrderCount / usersWithOrders).toFixed(1) : 0,
      avgSpentPerUser: users.length > 0 ? (totalSpent / users.length).toFixed(2) : 0,
      totalRevenue: totalSpent.toFixed(2)
    };
    
    metrics.notifications = {
      subscribedToPromotional: usersWithNotificationPrefs > 0 ? 
        Math.round((notificationPreferences.promotional / usersWithNotificationPrefs) * 100) : 0,
      subscribedToOrderStatus: usersWithNotificationPrefs > 0 ? 
        Math.round((notificationPreferences.order_status / usersWithNotificationPrefs) * 100) : 0,
      subscribedToSpecialOffers: usersWithNotificationPrefs > 0 ? 
        Math.round((notificationPreferences.special_offers / usersWithNotificationPrefs) * 100) : 0,
      subscribedToNewsletter: usersWithNotificationPrefs > 0 ? 
        Math.round((notificationPreferences.newsletter / usersWithNotificationPrefs) * 100) : 0
    };
    
    res.status(200).json({
      success: true,
      data: {
        segmentInfo: segment,
        userCount: users.length,
        metrics
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al obtener métricas del segmento '${req.params.segmentName}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener métricas del segmento',
      error: error.message
    });
  }
};
