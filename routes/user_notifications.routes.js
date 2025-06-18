const express = require('express');
const router = express.Router();
const userNotificationsController = require('../controllers/user_notifications.controller');
const { authenticate } = require("../middleware/auth.middleware");
const { body } = require('express-validator');

// Validadores
const validateTopicUpdate = [
  body('topic')
    .notEmpty().withMessage('El tipo de notificación es requerido')
    .isString().withMessage('El tipo debe ser un string'),
  
  body('enabled')
    .notEmpty().withMessage('El estado de activación es requerido')
    .isBoolean().withMessage('El estado debe ser un booleano')
];

const validatePreferencesUpdate = [
  body('preferences')
    .notEmpty().withMessage('Las preferencias son requeridas')
    .isObject().withMessage('Las preferencias deben ser un objeto')
];

// Rutas de preferencias de notificaciones
router.get(
  '/',
  authenticate,
  userNotificationsController.getNotificationPreferences
);

router.post(
  '/update',
  authenticate,
  validateTopicUpdate,
  userNotificationsController.updateNotificationPreference
);

router.post(
  '/update-all',
  authenticate,
  validatePreferencesUpdate,
  userNotificationsController.updateAllNotificationPreferences
);

module.exports = router;
