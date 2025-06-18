const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');

// Importar el controlador del dashboard
const dashboardRoutes = require('./admin/dashboardRoutes');

const { authenticate } = require('../middleware/auth.middleware');
const { validateSendGlobal } = require('../validators/notification.validators');

// Enviar notificación global a todos los usuarios
router.post('/notifications/send-global', authenticate, validateSendGlobal, AdminController.sendGlobalNotification);

// Ver historial de notificaciones
router.get('/notifications/history', authenticate, AdminController.getNotificationHistory);

// Usar las rutas del dashboard
router.use('/dashboard', dashboardRoutes);

module.exports = router;
