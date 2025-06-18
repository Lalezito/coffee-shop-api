// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Ruta para obtener preferencias de notificación de un usuario
router.get('/preferences/:userId', notificationController.getNotificationPreferences);

// Ruta para guardar/actualizar preferencias de notificación de un usuario
router.post('/preferences', notificationController.saveNotificationPreferences);

// Ruta para eliminar todas las notificaciones de un usuario
router.delete('/all/:userId', notificationController.deleteAllNotifications);

// TODO: conectar con el archivo principal de rutas (ej. index.js o app.js)

module.exports = router;
