const User = require('../models/user.model');
const Segment = require('../models/segment.model');
const ClerkService = require('./clerk.service');
const { default: mongoose } = require('mongoose');

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  Sentry = {
    captureException: (err) => console.error('Sentry no disponible:', err)
  };
}

/**
 * Servicio para gestionar la segmentación de usuarios
 */
class SegmentationService {
  /**
   * Obtener todos los segmentos
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} - Lista de segmentos
   */
  async getSegments(options = {}) {
    try {
      const query = { ...options };
      
      // Solo mostrar segmentos activos a menos que se indique lo contrario
      if (query.active === undefined) {
        query.active = true;
      }
      
      const segments = await Segment.find(query).sort({ createdAt: -1 });
      return segments;
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al obtener segmentos:', error);
      throw error;
    }
  }

  /**
   * Obtener un segmento por su nombre
   * @param {string} segmentName - Nombre del segmento
   * @returns {Promise<Object>} - Segmento encontrado
   */
  async getSegmentByName(segmentName) {
    try {
      const segment = await Segment.findOne({ name: segmentName });
      if (!segment) {
        throw new Error(`Segmento '${segmentName}' no encontrado`);
      }
      return segment;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al obtener segmento '${segmentName}':`, error);
      throw error;
    }
  }

  /**
   * Crear un nuevo segmento
   * @param {Object} segmentData - Datos del segmento
   * @returns {Promise<Object>} - Segmento creado
   */
  async createSegment(segmentData) {
    try {
      const segment = new Segment(segmentData);
      await segment.save();
      
      // Actualizar estimación de tamaño
      await this.updateSegmentSize(segment._id);
      
      return segment;
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al crear segmento:', error);
      throw error;
    }
  }

  /**
   * Actualizar un segmento existente
   * @param {string} segmentId - ID del segmento
   * @param {Object} updateData - Datos actualizados
   * @returns {Promise<Object>} - Segmento actualizado
   */
  async updateSegment(segmentId, updateData) {
    try {
      const segment = await Segment.findByIdAndUpdate(
        segmentId, 
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!segment) {
        throw new Error(`Segmento con ID '${segmentId}' no encontrado`);
      }
      
      // Actualizar estimación de tamaño si cambiaron las reglas
      if (updateData.rules) {
        await this.updateSegmentSize(segmentId);
      }
      
      return segment;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al actualizar segmento '${segmentId}':`, error);
      throw error;
    }
  }

  /**
   * Eliminar un segmento
   * @param {string} segmentId - ID del segmento
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async deleteSegment(segmentId) {
    try {
      const result = await Segment.findByIdAndDelete(segmentId);
      
      if (!result) {
        throw new Error(`Segmento con ID '${segmentId}' no encontrado`);
      }
      
      return { success: true, message: 'Segmento eliminado correctamente' };
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al eliminar segmento '${segmentId}':`, error);
      throw error;
    }
  }

  /**
   * Actualizar la estimación de tamaño de un segmento
   * @param {string} segmentId - ID del segmento
   * @returns {Promise<Number>} - Tamaño estimado actualizado
   */
  async updateSegmentSize(segmentId) {
    try {
      const segment = await Segment.findById(segmentId);
      
      if (!segment) {
        throw new Error(`Segmento con ID '${segmentId}' no encontrado`);
      }
      
      const users = await this.getUsersInSegment(segment.name);
      const count = users.length;
      
      // Actualizar el segmento con el nuevo tamaño estimado
      segment.estimatedSize = count;
      segment.lastSizeUpdate = new Date();
      await segment.save();
      
      return count;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al actualizar tamaño de segmento '${segmentId}':`, error);
      throw error;
    }
  }

  /**
   * Obtener usuarios que pertenecen a un segmento
   * @param {string} segmentName - Nombre del segmento
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Array>} - Lista de usuarios en el segmento
   */
  async getUsersInSegment(segmentName, options = {}) {
    try {
      const segment = await this.getSegmentByName(segmentName);
      
      if (!segment.active) {
        throw new Error(`El segmento '${segmentName}' no está activo`);
      }
      
      // Construir consulta a partir de las reglas de segmentación
      const query = this.buildMongoQueryFromRules(segment.rules);
      
      // Campos a seleccionar
      const projection = options.fields || '';
      
      // Obtener usuarios básicos primero
      const users = await User.find(query, projection);
      
      // Si se requiere la información completa del perfil, enriquecerla con datos de Clerk
      if (options.includeClerkProfile) {
        const enrichedUsers = [];
        
        for (const user of users) {
          try {
            // Obtener perfil completo de Clerk si está disponible
            const clerkProfile = await ClerkService.getUser(user.userId);
            
            if (clerkProfile.success) {
              // Combinar datos locales con datos de Clerk
              enrichedUsers.push({
                ...user.toObject(),
                clerkProfile: clerkProfile.user
              });
            } else {
              enrichedUsers.push(user.toObject());
            }
          } catch (e) {
            console.error(`Error obteniendo perfil Clerk para usuario ${user.userId}:`, e);
            enrichedUsers.push(user.toObject());
          }
        }
        
        return enrichedUsers;
      }
      
      return users;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al obtener usuarios del segmento '${segmentName}':`, error);
      throw error;
    }
  }

  /**
   * Obtener IDs de jugador de OneSignal para usuarios en un segmento
   * @param {string} segmentName - Nombre del segmento
   * @returns {Promise<Array>} - Lista de IDs de OneSignal
   */
  async getOneSignalPlayerIdsForSegment(segmentName) {
    try {
      const users = await this.getUsersInSegment(segmentName);
      
      // Extraer todos los IDs de jugador de OneSignal
      const allPlayerIds = users.reduce((ids, user) => {
        if (user.oneSignalPlayerIds && user.oneSignalPlayerIds.length > 0) {
          ids.push(...user.oneSignalPlayerIds);
        }
        return ids;
      }, []);
      
      // Eliminar duplicados si hay usuarios con múltiples dispositivos
      return [...new Set(allPlayerIds)];
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al obtener IDs de OneSignal para segmento '${segmentName}':`, error);
      throw error;
    }
  }

  /**
   * Construir consulta MongoDB a partir de las reglas de segmentación
   * @param {Array} rules - Reglas de segmentación
   * @returns {Object} - Consulta MongoDB
   */
  buildMongoQueryFromRules(rules) {
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return {}; // Sin reglas, devolver consulta vacía (coincide con todos)
    }
    
    // Todas las reglas deben cumplirse (AND lógico)
    const query = { $and: [] };
    
    for (const rule of rules) {
      let condition = {};
      const fieldPath = this.getMongoFieldPath(rule.type, rule.field);
      
      // Convertir valor si es necesario para consultas numéricas
      let value = rule.value;
      if (['greaterThan', 'lessThan', 'between'].includes(rule.operator)) {
        if (typeof value === 'string' && !isNaN(Number(value))) {
          value = Number(value);
        } else if (Array.isArray(value)) {
          value = value.map(v => typeof v === 'string' && !isNaN(Number(v)) ? Number(v) : v);
        }
      }
      
      // Manejar fechas
      if (fieldPath.includes('Date') && typeof value === 'string') {
        try {
          value = new Date(value);
        } catch (e) {
          console.warn(`No se pudo convertir '${value}' a fecha para campo ${fieldPath}`);
        }
      }
      
      switch (rule.operator) {
        case 'equals':
          condition[fieldPath] = value;
          break;
          
        case 'notEquals':
          condition[fieldPath] = { $ne: value };
          break;
          
        case 'contains':
          condition[fieldPath] = { $regex: value, $options: 'i' };
          break;
          
        case 'notContains':
          condition[fieldPath] = { $not: { $regex: value, $options: 'i' } };
          break;
          
        case 'greaterThan':
          condition[fieldPath] = { $gt: value };
          break;
          
        case 'lessThan':
          condition[fieldPath] = { $lt: value };
          break;
          
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            condition[fieldPath] = { $gte: value[0], $lte: value[1] };
          }
          break;
          
        case 'in':
          condition[fieldPath] = { $in: Array.isArray(value) ? value : [value] };
          break;
          
        case 'notIn':
          condition[fieldPath] = { $nin: Array.isArray(value) ? value : [value] };
          break;
          
        case 'exists':
          condition[fieldPath] = { $exists: true, $ne: null };
          break;
          
        case 'notExists':
          condition[fieldPath] = { $exists: false };
          break;
          
        case 'daysAgo':
          const daysAgo = Number(value);
          if (!isNaN(daysAgo)) {
            const daysAgoDate = new Date();
            daysAgoDate.setDate(daysAgoDate.getDate() - daysAgo);
            condition[fieldPath] = { $gte: daysAgoDate };
          }
          break;

        case 'olderThanDays':
          const olderThanDays = Number(value);
          if (!isNaN(olderThanDays)) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            condition[fieldPath] = { $lt: cutoffDate };
          }
          break;
      }
      
      query.$and.push(condition);
    }
    
    return query.$and.length > 0 ? query : {};
  }

  /**
   * Obtener la ruta de campo MongoDB basada en el tipo y campo de regla
   * @param {string} ruleType - Tipo de regla
   * @param {string} ruleField - Campo de regla
   * @returns {string} - Ruta de campo para consulta MongoDB
   */
  getMongoFieldPath(ruleType, ruleField) {
    // Mapeo de tipos de reglas a campos MongoDB
    const fieldMappings = {
      demographic: {
        age: 'age',
        gender: 'gender',
        language: 'language',
        country: 'addresses.country',
        city: 'addresses.city',
        registrationDate: 'createdAt'
      },
      behavior: {
        lastLogin: 'lastLoginAt',
        visits: 'analytics.visits',
        ordersCount: 'analytics.ordersCount',
        avgOrderValue: 'analytics.avgOrderValue',
        lastActive: 'lastActiveAt',
        loginCount: 'analytics.loginCount',
        daysInactive: 'daysInactive'
      },
      preference: {
        // Preferencias de café
        coffeeIntensity: 'notificationPreferences.intensity',
        coffeeSweetness: 'notificationPreferences.sweetness',
        milkRatio: 'notificationPreferences.milkRatio',
        // Preferencias de notificaciones
        promotional: 'notificationPreferences.promotional',
        orderStatus: 'notificationPreferences.order_status',
        specialOffers: 'notificationPreferences.special_offers',
        newsletter: 'notificationPreferences.newsletter',
        // Bebidas favoritas
        favoriteDrink: 'favoriteDrinks.name'
      },
      purchase: {
        totalSpent: 'analytics.totalSpent',
        lastPurchaseDate: 'analytics.lastPurchaseDate',
        favoriteProduct: 'analytics.favoriteProduct',
        purchaseFrequency: 'analytics.purchaseFrequency',
        orderValue: 'analytics.avgOrderValue',
        daysFromLastOrder: 'analytics.daysSinceLastOrder'
      },
      engagement: {
        appOpenCount: 'analytics.appOpenCount',
        notificationClickRate: 'analytics.notificationOpenRate',
        productViewCount: 'analytics.productViews',
        cartAbandonment: 'analytics.cartAbandonmentRate',
        reviewCount: 'analytics.reviewCount',
        reviewScore: 'analytics.avgReviewScore'
      },
      location: {
        city: 'addresses.city',
        zipCode: 'addresses.zipCode',
        country: 'addresses.country',
        state: 'addresses.state',
        storeVisits: 'analytics.storeVisits',
        nearestStore: 'analytics.preferredStore'
      },
      // Nuevo tipo para dispositivos
      device: {
        platform: 'devices.platform',
        deviceModel: 'devices.model',
        osVersion: 'devices.osVersion',
        appVersion: 'devices.appVersion',
        pushEnabled: 'devices.pushEnabled'
      }
    };
    
    // Si existe un mapeo definido, usarlo
    if (fieldMappings[ruleType] && fieldMappings[ruleType][ruleField]) {
      return fieldMappings[ruleType][ruleField];
    }
    
    // Si no hay mapeo, usar el campo directamente
    return ruleField;
  }

  /**
   * Ejecutar un proceso de segmentación para todos los segmentos activos
   * Este método se puede usar para actualizar las métricas de segmentos
   * @returns {Promise<Object>} - Resultados del proceso de segmentación
   */
  async runSegmentation() {
    try {
      const results = {
        processedSegments: 0,
        updatedSegments: [],
        errors: []
      };

      // Obtener todos los segmentos activos
      const segments = await Segment.find({ active: true });
      
      for (const segment of segments) {
        try {
          // Actualizar tamaño y stats del segmento
          const size = await this.updateSegmentSize(segment._id);
          
          results.processedSegments++;
          results.updatedSegments.push({
            id: segment._id,
            name: segment.name,
            size: size
          });
        } catch (error) {
          Sentry.captureException(error);
          console.error(`Error procesando segmento '${segment.name}':`, error);
          
          results.errors.push({
            segmentId: segment._id,
            segmentName: segment.name,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al ejecutar proceso de segmentación:', error);
      throw error;
    }
  }

  /**
   * Actualizar estadísticas analíticas de los usuarios para mejorar la segmentación
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async updateUserAnalytics() {
    try {
      const now = new Date();
      const results = {
        updatedUsers: 0,
        errors: []
      };

      // Obtener todos los usuarios activos
      const users = await User.find({ active: true });
      
      for (const user of users) {
        try {
          // Calcular días desde último login
          if (user.lastLoginAt) {
            const lastLogin = new Date(user.lastLoginAt);
            const daysSinceLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
            user.daysInactive = daysSinceLogin;
          }
          
          // Calcular días desde última compra
          if (user.analytics && user.analytics.lastPurchaseDate) {
            const lastPurchase = new Date(user.analytics.lastPurchaseDate);
            const daysSinceLastOrder = Math.floor((now - lastPurchase) / (1000 * 60 * 60 * 24));
            user.analytics.daysSinceLastOrder = daysSinceLastOrder;
          }
          
          // Guardar cambios
          await user.save();
          results.updatedUsers++;
        } catch (error) {
          Sentry.captureException(error);
          console.error(`Error actualizando analytics para usuario '${user._id}':`, error);
          
          results.errors.push({
            userId: user._id,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al actualizar analytics de usuarios:', error);
      throw error;
    }
  }
}

module.exports = new SegmentationService();
