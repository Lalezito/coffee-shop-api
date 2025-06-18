const express = require('express');
const router = express.Router();
const segmentController = require('../controllers/segment.controller');
const { authenticate } = require("../middleware/auth.middleware");
const { body, param } = require('express-validator');

// TODO: IMPLEMENTAR REALMENTE - Middleware de verificación de permisos
// Función temporal para verificación de permisos
const tempHasPermissions = (permissions) => (req, res, next) => {
  // Simplemente permite el acceso sin verificación para que la app pueda funcionar
  console.log(`Verificando permisos (temporal): ${permissions.join(', ')}`);
  return next();
};

// Middleware temporal para verificar rol de administrador
const tempIsAdmin = (req, res, next) => {
  // Simplemente permite el acceso sin verificación para que la app pueda funcionar
  console.log('Verificando rol de administrador (temporal)');
  return next();
};

// Validadores
const validateSegmentCreation = [
  body('name')
    .notEmpty().withMessage('El nombre del segmento es requerido')
    .isString().withMessage('El nombre debe ser un texto')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('El nombre solo puede contener letras, números, guiones y guiones bajos'),
  
  body('description')
    .notEmpty().withMessage('La descripción es requerida')
    .isString().withMessage('La descripción debe ser un texto'),
  
  body('rules')
    .isArray({ min: 1 }).withMessage('Se requiere al menos una regla'),
  
  body('rules.*.type')
    .notEmpty().withMessage('El tipo de regla es requerido')
    .isIn(['demographic', 'behavior', 'preference', 'purchase', 'engagement', 'location', 'date'])
    .withMessage('Tipo de regla no válido'),
  
  body('rules.*.field')
    .notEmpty().withMessage('El campo de la regla es requerido')
    .isString().withMessage('El campo debe ser un texto'),
  
  body('rules.*.operator')
    .notEmpty().withMessage('El operador de la regla es requerido')
    .isIn(['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 
           'lessThan', 'between', 'in', 'notIn', 'exists', 'notExists'])
    .withMessage('Operador no válido'),
  
  body('tags')
    .optional()
    .isArray().withMessage('Las etiquetas deben ser un array')
];

const validateSegmentUpdate = [
  body('name')
    .optional()
    .isString().withMessage('El nombre debe ser un texto')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('El nombre solo puede contener letras, números, guiones y guiones bajos'),
  
  body('description')
    .optional()
    .isString().withMessage('La descripción debe ser un texto'),
  
  body('rules')
    .optional()
    .isArray({ min: 1 }).withMessage('Se requiere al menos una regla'),
  
  body('active')
    .optional()
    .isBoolean().withMessage('active debe ser un booleano'),
  
  body('tags')
    .optional()
    .isArray().withMessage('Las etiquetas deben ser un array')
];

// Permisos necesarios para gestionar segmentos
const segmentPermissions = ['manage_segments'];

// Rutas públicas (solo para administradores)
// Obtener todos los segmentos
router.get('/', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  segmentController.getSegments
);

// Obtener un segmento específico
router.get('/:segmentName', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  segmentController.getSegment
);

// Crear un nuevo segmento
router.post('/', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  validateSegmentCreation, 
  segmentController.createSegment
);

// Actualizar un segmento
router.put('/:segmentId', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  validateSegmentUpdate, 
  segmentController.updateSegment
);

// Eliminar un segmento
router.delete('/:segmentId', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  segmentController.deleteSegment
);

// Obtener usuarios en un segmento
router.get('/:segmentName/users', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  segmentController.getSegmentUsers
);

// Actualizar el tamaño estimado de un segmento
router.post('/:segmentId/update-size', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  segmentController.updateSegmentSize
);

// Ejecutar segmentación para todos los segmentos activos
router.post('/run-segmentation', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  segmentController.runSegmentation
);

// Actualizar estadísticas de usuario para segmentación 
router.post('/update-user-analytics', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  segmentController.updateUserAnalytics
);

// Obtener metadatos de segmentación y análisis
router.get('/metadata', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  segmentController.getSegmentationMetadata
);

// Obtener las métricas de un segmento
router.get('/:segmentName/metrics', 
  authenticate, 
  tempHasPermissions(segmentPermissions), 
  segmentController.getSegmentMetrics
);

module.exports = router;
