const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');

const { authenticate } = require("../middleware/auth.middleware");
const { validateRegisterDevice, validateSendToUser, validateSendOrderStatus } = require('../validators/notification.validators');

// Registrar un dispositivo para notificaciones
router.post('/register-device', authenticate, validateRegisterDevice, NotificationController.registerDevice);

// Enviar notificación a un usuario específico
router.post('/send-to-user', authenticate, validateSendToUser, NotificationController.sendToUser);

// Notificar cambio de estado de una orden
router.post('/send-order-status', authenticate, validateSendOrderStatus, NotificationController.sendOrderStatus);

module.exports = router;
