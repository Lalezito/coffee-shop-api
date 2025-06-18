const express = require('express');
const router = express.Router();
const experimentController = require('../controllers/experiment.controller');
const { authenticate } = require("../middleware/auth.middleware");
const { body, param } = require('express-validator');

// TODO: IMPLEMENTAR REALMENTE - Middleware de verificación de permisos
// Función temporal para verificación de permisos
const tempHasPermissions = (permissions) => (req, res, next) => {
  // Simplemente permite el acceso sin verificación para que la app pueda funcionar
  console.log(`Verificando permisos (temporal): ${permissions.join(', ')}`);
  return next();
};

// Validadores
const validateExperimentCreation = [
  body('name')
    .notEmpty().withMessage('El nombre del experimento es requerido')
    .isString().withMessage('El nombre debe ser un texto')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('El nombre solo puede contener letras, números, guiones y guiones bajos'),
  
  body('description')
    .notEmpty().withMessage('La descripción es requerida')
    .isString().withMessage('La descripción debe ser un texto'),
  
  body('segment')
    .notEmpty().withMessage('El nombre del segmento es requerido')
    .isString().withMessage('El nombre del segmento debe ser un texto'),
  
  body('variants')
    .isArray({ min: 2 }).withMessage('Se requieren al menos 2 variantes'),
  
  body('variants.*.name')
    .notEmpty().withMessage('El nombre de la variante es requerido')
    .isString().withMessage('El nombre de la variante debe ser un texto'),
  
  body('variants.*.title')
    .notEmpty().withMessage('El título de la variante es requerido')
    .isString().withMessage('El título debe ser un texto'),
  
  body('variants.*.content')
    .notEmpty().withMessage('El contenido de la variante es requerido')
    .isString().withMessage('El contenido debe ser un texto'),
  
  body('variants.*.weight')
    .notEmpty().withMessage('El peso de la variante es requerido')
    .isInt({ min: 1, max: 100 }).withMessage('El peso debe ser un número entre 1 y 100'),
  
  body('primaryMetric')
    .optional()
    .isIn(['opens', 'clicks', 'conversions']).withMessage('Métrica principal no válida'),
  
  body('durationDays')
    .optional()
    .isInt({ min: 1 }).withMessage('La duración debe ser un número entero mayor a 0')
];

const validateExperimentUpdate = [
  body('name')
    .optional()
    .isString().withMessage('El nombre debe ser un texto')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('El nombre solo puede contener letras, números, guiones y guiones bajos'),
  
  body('description')
    .optional()
    .isString().withMessage('La descripción debe ser un texto'),
  
  body('status')
    .optional()
    .isIn(['draft', 'active', 'paused', 'completed', 'cancelled']).withMessage('Estado no válido'),
  
  body('durationDays')
    .optional()
    .isInt({ min: 1 }).withMessage('La duración debe ser un número entero mayor a 0'),
  
  body('confidenceThreshold')
    .optional()
    .isInt({ min: 80, max: 99 }).withMessage('El umbral de confianza debe ser un número entre 80 y 99')
];

// Permisos necesarios para gestionar experimentos
const experimentPermissions = ['manage_experiments'];

// Rutas públicas (solo para administradores)
// Obtener todos los experimentos
router.get('/', 
  authenticate, 
  tempHasPermissions(experimentPermissions), 
  experimentController.getExperiments
);

// Obtener un experimento específico
router.get('/:experimentName', 
  authenticate, 
  tempHasPermissions(experimentPermissions), 
  experimentController.getExperiment
);

// Crear un nuevo experimento
router.post('/', 
  authenticate, 
  tempHasPermissions(experimentPermissions), 
  validateExperimentCreation, 
  experimentController.createExperiment
);

// Actualizar un experimento
router.put('/:experimentId', 
  authenticate, 
  tempHasPermissions(experimentPermissions), 
  validateExperimentUpdate, 
  experimentController.updateExperiment
);

// Eliminar un experimento
router.delete('/:experimentId', 
  authenticate, 
  tempHasPermissions(experimentPermissions), 
  experimentController.deleteExperiment
);

// Control de experimentos
router.post('/:experimentId/start', 
  authenticate, 
  tempHasPermissions(experimentPermissions), 
  experimentController.startExperiment
);

router.post('/:experimentId/pause', 
  authenticate, 
  tempHasPermissions(experimentPermissions), 
  experimentController.pauseExperiment
);

router.post('/:experimentId/complete', 
  authenticate, 
  tempHasPermissions(experimentPermissions), 
  experimentController.completeExperiment
);

// Enviar notificación con experimento
router.post('/:experimentName/send', 
  authenticate, 
  tempHasPermissions(experimentPermissions), 
  experimentController.sendExperimentNotification
);

// Registrar métrica (endpoint público para uso desde frontend/webhook)
router.post('/track/:experimentName/:variantName/:metricName', 
  experimentController.trackMetric
);

module.exports = router;
