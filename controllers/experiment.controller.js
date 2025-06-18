const ExperimentService = require('../services/experiment.service');
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
 * Obtener todos los experimentos
 */
exports.getExperiments = async (req, res) => {
  try {
    // Extraer opciones de filtrado desde la query
    const { status } = req.query;
    const options = {};
    
    if (status) {
      options.status = status;
    }
    
    const experiments = await ExperimentService.getExperiments(options);
    
    res.status(200).json({
      success: true,
      data: {
        experiments,
        count: experiments.length
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener experimentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener experimentos',
      error: error.message
    });
  }
};

/**
 * Obtener un experimento específico por nombre
 */
exports.getExperiment = async (req, res) => {
  try {
    const { experimentName } = req.params;
    const experiment = await ExperimentService.getExperimentByName(experimentName);
    
    res.status(200).json({
      success: true,
      data: { experiment }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al obtener experimento '${req.params.experimentName}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener experimento',
      error: error.message
    });
  }
};

/**
 * Crear un nuevo experimento
 */
exports.createExperiment = async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const experimentData = req.body;
    const experiment = await ExperimentService.createExperiment(experimentData);
    
    res.status(201).json({
      success: true,
      message: 'Experimento creado exitosamente',
      data: { experiment }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al crear experimento:', error);
    
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
        message: 'Ya existe un experimento con ese nombre'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear experimento',
      error: error.message
    });
  }
};

/**
 * Actualizar un experimento existente
 */
exports.updateExperiment = async (req, res) => {
  try {
    // Validar entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { experimentId } = req.params;
    const updateData = req.body;
    
    const experiment = await ExperimentService.updateExperiment(experimentId, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Experimento actualizado exitosamente',
      data: { experiment }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al actualizar experimento '${req.params.experimentId}':`, error);
    
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
      message: 'Error al actualizar experimento',
      error: error.message
    });
  }
};

/**
 * Eliminar un experimento
 */
exports.deleteExperiment = async (req, res) => {
  try {
    const { experimentId } = req.params;
    await ExperimentService.deleteExperiment(experimentId);
    
    res.status(200).json({
      success: true,
      message: 'Experimento eliminado exitosamente'
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al eliminar experimento '${req.params.experimentId}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('no se puede eliminar')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al eliminar experimento',
      error: error.message
    });
  }
};

/**
 * Iniciar un experimento
 */
exports.startExperiment = async (req, res) => {
  try {
    const { experimentId } = req.params;
    const experiment = await ExperimentService.startExperiment(experimentId);
    
    res.status(200).json({
      success: true,
      message: 'Experimento iniciado exitosamente',
      data: { experiment }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al iniciar experimento '${req.params.experimentId}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('No se puede iniciar')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al iniciar experimento',
      error: error.message
    });
  }
};

/**
 * Pausar un experimento
 */
exports.pauseExperiment = async (req, res) => {
  try {
    const { experimentId } = req.params;
    const experiment = await ExperimentService.pauseExperiment(experimentId);
    
    res.status(200).json({
      success: true,
      message: 'Experimento pausado exitosamente',
      data: { experiment }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al pausar experimento '${req.params.experimentId}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('No se puede pausar')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al pausar experimento',
      error: error.message
    });
  }
};

/**
 * Completar un experimento
 */
exports.completeExperiment = async (req, res) => {
  try {
    const { experimentId } = req.params;
    const experiment = await ExperimentService.completeExperiment(experimentId);
    
    res.status(200).json({
      success: true,
      message: `Experimento completado exitosamente. Variante ganadora: ${experiment.winner || 'Ninguna'}`,
      data: { experiment }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al completar experimento '${req.params.experimentId}':`, error);
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('No se puede completar')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al completar experimento',
      error: error.message
    });
  }
};

/**
 * Enviar notificación de experimento
 */
exports.sendExperimentNotification = async (req, res) => {
  try {
    const { experimentName } = req.params;
    const { additionalData } = req.body;
    
    const result = await ExperimentService.sendExperimentNotification(experimentName, additionalData);
    
    res.status(200).json({
      success: true,
      message: 'Notificación de experimento enviada exitosamente',
      data: result
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al enviar notificación de experimento '${req.params.experimentName}':`, error);
    
    if (error.message.includes('no encontrado') || error.message.includes('no está activo')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación de experimento',
      error: error.message
    });
  }
};

/**
 * Registrar una métrica de experimento
 */
exports.trackMetric = async (req, res) => {
  try {
    const { experimentName, variantName, metricName } = req.params;
    const { value } = req.body;
    
    const experiment = await ExperimentService.trackMetric(
      experimentName,
      variantName,
      metricName,
      value || 1
    );
    
    res.status(200).json({
      success: true,
      message: 'Métrica registrada exitosamente',
      data: {
        experimentName,
        variantName,
        metricName,
        value: value || 1
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error al registrar métrica '${req.params.metricName}' para variante '${req.params.variantName}' del experimento '${req.params.experimentName}':`, error);
    
    if (error.message.includes('no encontrado') || error.message.includes('no válida')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al registrar métrica',
      error: error.message
    });
  }
};
