const Experiment = require('../models/experiment.model');
const SegmentationService = require('./segmentation.service');
const OneSignalService = require('./onesignal.service');

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  Sentry = {
    captureException: (err) => console.error('Sentry no disponible:', err)
  };
}

/**
 * Servicio para gestionar experimentos A/B de notificaciones
 */
class ExperimentService {
  /**
   * Obtener todos los experimentos
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} - Lista de experimentos
   */
  async getExperiments(options = {}) {
    try {
      const query = { ...options };
      
      const experiments = await Experiment.find(query).sort({ createdAt: -1 });
      return experiments;
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al obtener experimentos:', error);
      throw error;
    }
  }

  /**
   * Obtener un experimento por nombre
   * @param {string} experimentName - Nombre del experimento
   * @returns {Promise<Object>} - Experimento encontrado
   */
  async getExperimentByName(experimentName) {
    try {
      const experiment = await Experiment.findOne({ name: experimentName });
      if (!experiment) {
        throw new Error(`Experimento '${experimentName}' no encontrado`);
      }
      return experiment;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al obtener experimento '${experimentName}':`, error);
      throw error;
    }
  }

  /**
   * Crear un nuevo experimento
   * @param {Object} experimentData - Datos del experimento
   * @returns {Promise<Object>} - Experimento creado
   */
  async createExperiment(experimentData) {
    try {
      // Validar que el segmento exista
      await SegmentationService.getSegmentByName(experimentData.segment);
      
      const experiment = new Experiment(experimentData);
      await experiment.save();
      
      return experiment;
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al crear experimento:', error);
      throw error;
    }
  }

  /**
   * Actualizar un experimento existente
   * @param {string} experimentId - ID del experimento
   * @param {Object} updateData - Datos actualizados
   * @returns {Promise<Object>} - Experimento actualizado
   */
  async updateExperiment(experimentId, updateData) {
    try {
      // No permitir actualizar ciertos campos si el experimento ya está activo
      const currentExperiment = await Experiment.findById(experimentId);
      
      if (!currentExperiment) {
        throw new Error(`Experimento con ID '${experimentId}' no encontrado`);
      }
      
      if (currentExperiment.status === 'active' || currentExperiment.status === 'completed') {
        // Campos que no se pueden modificar una vez que el experimento está activo
        const restrictedFields = ['variants', 'segment', 'startDate', 'primaryMetric'];
        
        for (const field of restrictedFields) {
          if (updateData[field] !== undefined) {
            throw new Error(`No se puede modificar el campo '${field}' cuando el experimento está activo o completado`);
          }
        }
      }
      
      const experiment = await Experiment.findByIdAndUpdate(
        experimentId, 
        updateData,
        { new: true, runValidators: true }
      );
      
      return experiment;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al actualizar experimento '${experimentId}':`, error);
      throw error;
    }
  }

  /**
   * Eliminar un experimento
   * @param {string} experimentId - ID del experimento
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async deleteExperiment(experimentId) {
    try {
      const experiment = await Experiment.findById(experimentId);
      
      if (!experiment) {
        throw new Error(`Experimento con ID '${experimentId}' no encontrado`);
      }
      
      if (experiment.status === 'active') {
        throw new Error('No se puede eliminar un experimento activo. Primero debe pausarse o cancelarse.');
      }
      
      await Experiment.findByIdAndDelete(experimentId);
      
      return { success: true, message: 'Experimento eliminado correctamente' };
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al eliminar experimento '${experimentId}':`, error);
      throw error;
    }
  }

  /**
   * Iniciar un experimento
   * @param {string} experimentId - ID del experimento
   * @returns {Promise<Object>} - Experimento actualizado
   */
  async startExperiment(experimentId) {
    try {
      const experiment = await Experiment.findById(experimentId);
      
      if (!experiment) {
        throw new Error(`Experimento con ID '${experimentId}' no encontrado`);
      }
      
      if (experiment.status !== 'draft' && experiment.status !== 'paused') {
        throw new Error(`No se puede iniciar un experimento en estado '${experiment.status}'`);
      }
      
      // Establecer fecha de inicio y estado
      experiment.status = 'active';
      experiment.startDate = new Date();
      
      // Calcular fecha de finalización basada en la duración
      if (experiment.durationDays) {
        const endDate = new Date(experiment.startDate);
        endDate.setDate(endDate.getDate() + experiment.durationDays);
        experiment.endDate = endDate;
      }
      
      await experiment.save();
      
      return experiment;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al iniciar experimento '${experimentId}':`, error);
      throw error;
    }
  }

  /**
   * Pausar un experimento activo
   * @param {string} experimentId - ID del experimento
   * @returns {Promise<Object>} - Experimento actualizado
   */
  async pauseExperiment(experimentId) {
    try {
      const experiment = await Experiment.findById(experimentId);
      
      if (!experiment) {
        throw new Error(`Experimento con ID '${experimentId}' no encontrado`);
      }
      
      if (experiment.status !== 'active') {
        throw new Error(`No se puede pausar un experimento que no está activo (estado actual: '${experiment.status}')`);
      }
      
      experiment.status = 'paused';
      await experiment.save();
      
      return experiment;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al pausar experimento '${experimentId}':`, error);
      throw error;
    }
  }

  /**
   * Completar un experimento y determinar ganador
   * @param {string} experimentId - ID del experimento
   * @returns {Promise<Object>} - Experimento actualizado con ganador
   */
  async completeExperiment(experimentId) {
    try {
      const experiment = await Experiment.findById(experimentId);
      
      if (!experiment) {
        throw new Error(`Experimento con ID '${experimentId}' no encontrado`);
      }
      
      if (experiment.status !== 'active' && experiment.status !== 'paused') {
        throw new Error(`No se puede completar un experimento en estado '${experiment.status}'`);
      }
      
      // Determinar la variante ganadora según la métrica principal
      const winner = this._determineWinner(experiment);
      
      // Actualizar el experimento
      experiment.status = 'completed';
      experiment.endDate = new Date();
      experiment.winner = winner;
      await experiment.save();
      
      return experiment;
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al completar experimento '${experimentId}':`, error);
      throw error;
    }
  }

  /**
   * Enviar notificación utilizando un experimento A/B
   * @param {string} experimentName - Nombre del experimento
   * @param {Object} additionalData - Datos adicionales para incluir en la notificación
   * @returns {Promise<Object>} - Resultado del envío
   */
  async sendExperimentNotification(experimentName, additionalData = {}) {
    try {
      const experiment = await this.getExperimentByName(experimentName);
      
      if (experiment.status !== 'active') {
        throw new Error(`No se puede enviar notificación: el experimento '${experimentName}' no está activo`);
      }
      
      // Obtener el segmento de usuarios
      const segmentName = experiment.segment;
      
      // Obtener los IDs de usuarios en el segmento
      const playerIds = await SegmentationService.getOneSignalPlayerIdsForSegment(segmentName);
      
      if (!playerIds.length) {
        return {
          success: false,
          message: `No hay usuarios en el segmento '${segmentName}'`
        };
      }
      
      // Distribuir jugadores entre variantes según los pesos
      const variantAssignments = this._distributePlayerIds(playerIds, experiment.variants);
      
      // Enviar cada variante a su grupo correspondiente
      const results = [];
      
      for (const variant of experiment.variants) {
        const variantPlayerIds = variantAssignments[variant.name];
        
        if (!variantPlayerIds || !variantPlayerIds.length) {
          continue;
        }
        
        // Combinar datos adicionales con los específicos de la variante
        const mergedData = {
          ...additionalData,
          ...variant.additionalData,
          experimentName,
          variantName: variant.name
        };
        
        // Enviar la notificación
        const result = await OneSignalService.sendToPlayerIds(
          variantPlayerIds,
          variant.title,
          variant.content,
          mergedData
        );
        
        // Actualizar métricas de impresiones
        await this._updateVariantMetric(experimentName, variant.name, 'impressions', variantPlayerIds.length);
        
        results.push({
          variant: variant.name,
          recipients: variantPlayerIds.length,
          notificationId: result.id
        });
      }
      
      return {
        success: true,
        message: `Notificación de experimento enviada a ${playerIds.length} usuarios`,
        variants: results
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al enviar notificación de experimento '${experimentName}':`, error);
      throw error;
    }
  }

  /**
   * Registrar una métrica para una variante de experimento
   * @param {string} experimentName - Nombre del experimento
   * @param {string} variantName - Nombre de la variante
   * @param {string} metricName - Nombre de la métrica (opens, clicks, conversions)
   * @param {number} value - Valor a incrementar (por defecto 1)
   * @returns {Promise<Object>} - Experimento actualizado
   */
  async trackMetric(experimentName, variantName, metricName, value = 1) {
    try {
      if (!['impressions', 'opens', 'clicks', 'conversions'].includes(metricName)) {
        throw new Error(`Métrica '${metricName}' no válida`);
      }
      
      return this._updateVariantMetric(experimentName, variantName, metricName, value);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al registrar métrica '${metricName}' para variante '${variantName}' del experimento '${experimentName}':`, error);
      throw error;
    }
  }

  /**
   * Actualizar métrica de una variante (método interno)
   * @param {string} experimentName - Nombre del experimento
   * @param {string} variantName - Nombre de la variante
   * @param {string} metricName - Nombre de la métrica
   * @param {number} value - Valor a incrementar
   * @returns {Promise<Object>} - Experimento actualizado
   */
  async _updateVariantMetric(experimentName, variantName, metricName, value) {
    // Construir el campo de actualización para la métrica específica de la variante
    const updateField = {};
    updateField[`variants.$[elem].metrics.${metricName}`] = value;
    
    const experiment = await Experiment.findOneAndUpdate(
      { name: experimentName },
      { $inc: updateField },
      {
        arrayFilters: [{ "elem.name": variantName }],
        new: true
      }
    );
    
    if (!experiment) {
      throw new Error(`Experimento '${experimentName}' no encontrado`);
    }
    
    return experiment;
  }

  /**
   * Distribuir IDs de jugadores entre variantes según sus pesos
   * @param {Array} playerIds - IDs de jugadores a distribuir
   * @param {Array} variants - Variantes del experimento
   * @returns {Object} - Mapa de variantes con sus IDs asignados
   */
  _distributePlayerIds(playerIds, variants) {
    // Mezclar aleatoriamente los IDs
    const shuffledIds = [...playerIds].sort(() => 0.5 - Math.random());
    const totalCount = shuffledIds.length;
    
    // Mapa de resultados
    const result = {};
    
    // Punto de inicio para cada grupo
    let startIndex = 0;
    
    // Asignar IDs a cada variante según su peso
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      result[variant.name] = [];
      
      // Si es la última variante, tomar todos los IDs restantes
      if (i === variants.length - 1) {
        result[variant.name] = shuffledIds.slice(startIndex);
        break;
      }
      
      // Calcular cuántos IDs corresponden a esta variante según su peso
      const count = Math.floor((variant.weight / 100) * totalCount);
      result[variant.name] = shuffledIds.slice(startIndex, startIndex + count);
      startIndex += count;
    }
    
    return result;
  }

  /**
   * Determinar la variante ganadora del experimento
   * @param {Object} experiment - Objeto de experimento
   * @returns {string} - Nombre de la variante ganadora
   */
  _determineWinner(experiment) {
    const metric = experiment.primaryMetric;
    let bestRatio = -1;
    let winner = null;
    
    for (const variant of experiment.variants) {
      // No considerar variantes sin impresiones
      if (!variant.metrics.impressions) {
        continue;
      }
      
      // Calcular ratio de éxito
      const ratio = variant.metrics[metric] / variant.metrics.impressions;
      
      if (ratio > bestRatio) {
        bestRatio = ratio;
        winner = variant.name;
      }
    }
    
    return winner;
  }
}

module.exports = new ExperimentService();
