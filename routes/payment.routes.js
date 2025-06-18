// routes/payment.routes.js
const express = require('express');
const router = express.Router();

// Importar los controladores modernizados
const paymentController = require('../controllers/paymentController');

// Mantener compatibilidad con los controladores existentes
const legacyPaymentController = require('../controllers/payment.controller');
const paymentMethodsController = require('../controllers/payment-methods.controller');

// Middleware
const { authenticate } = require("../middleware/auth.middleware");
const {
  createPaymentIntentValidator,
  confirmPaymentValidator,
  addPaymentMethodValidator,
  removePaymentMethodValidator,
  createRefundValidator
} = require('../validators/payment.validator');

// Middleware para capturar el body raw para webhooks (necesario para verificar firmas)
const rawBodyMiddleware = express.raw({ type: 'application/json' });

// ============= RUTAS LEGACY (COMPATIBILIDAD) =============

// Crear intención de pago (legacy)
router.post('/create-payment-intent',
  authenticate,
  createPaymentIntentValidator,
  legacyPaymentController.createPaymentIntent
);

// Confirmar pago después de 3D Secure (legacy)
router.post('/confirm-payment',
  authenticate,
  confirmPaymentValidator,
  legacyPaymentController.confirmPayment
);

// Añadir método de pago (legacy)
router.post('/payment-methods',
  authenticate,
  addPaymentMethodValidator,
  legacyPaymentController.addPaymentMethod
);

// Obtener métodos de pago (legacy)
router.get('/payment-methods',
  authenticate,
  legacyPaymentController.getPaymentMethods
);

// Eliminar método de pago (legacy)
router.delete('/payment-methods/:paymentMethodId',
  authenticate,
  removePaymentMethodValidator,
  legacyPaymentController.removePaymentMethod
);

// Procesar reembolso (legacy)
router.post('/refunds',
  authenticate,
  createRefundValidator,
  legacyPaymentController.createRefund
);

// Webhook de Stripe (legacy)
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  legacyPaymentController.handleWebhook
);

// ============= RUTAS PRINCIPALES (STRIPE INTEGRACIÓN) =============

// Procesar pagos con tarjeta
router.post('/process',
  authenticate,
  paymentController.processPayment
);

// Procesar pagos con Apple Pay
router.post('/apple-pay/process',
  authenticate,
  paymentController.processApplePayment
);

// Guardar método de pago
router.post('/methods',
  authenticate,
  paymentController.savePaymentMethod
);

// Obtener métodos de pago por usuario
router.get('/methods/:userId',
  authenticate,
  paymentController.getPaymentMethods
);

// Eliminar método de pago
router.delete('/methods/:methodId',
  authenticate,
  paymentController.deletePaymentMethod
);

// Crear cliente Stripe para un usuario
router.post('/customers/:userId',
  authenticate,
  paymentController.createStripeCustomer
);

// Historial de pagos de un usuario
router.get('/history/:userId',
  authenticate,
  paymentController.getPaymentHistory
);

// Detalles de un pago específico
router.get('/details/:paymentId',
  authenticate,
  paymentController.getPaymentDetails
);

// Webhook de Stripe (sin autenticación)
router.post('/webhook',
  rawBodyMiddleware,
  paymentController.handleStripeWebhook
);

// ============= MÉTODOS DE PAGO ESPECÍFICOS PENDIENTES DE IMPLEMENTACIÓN =============

// TODO: IMPLEMENTAR REALMENTE - Endpoints para Apple Pay (verificación de soporte)
router.get('/apple-pay/check-support',
  authenticate,
  paymentMethodsController.checkApplePaySupport
);

// TODO: IMPLEMENTAR REALMENTE - Endpoints para PayPal
router.post('/paypal/initiate',
  authenticate,
  paymentMethodsController.initiatePayPal
);

router.get('/paypal/capture',
  paymentMethodsController.capturePayPal
);

router.get('/paypal/cancel',
  paymentMethodsController.cancelPayPal
);

// TODO: IMPLEMENTAR REALMENTE - Endpoints para pagos en efectivo
router.post('/cash/process',
  authenticate,
  paymentMethodsController.processCashPayment
);

router.post('/cash/confirm',
  authenticate,
  paymentMethodsController.confirmCashPayment
);

module.exports = router;
