/**
 * Validadores para las rutas de pagos
 */
const { body, param } = require('express-validator');

/**
 * Validador para la creación de un PaymentIntent
 */
exports.createPaymentIntentValidator = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser un número mayor que cero'),
  
  body('currency')
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('La moneda debe ser un código ISO de 3 letras (ej: mxn, usd)')
    .optional(),
    
  body('paymentMethodId')
    .isString()
    .withMessage('ID de método de pago inválido')
    .optional(),
    
  body('orderId')
    .isString()
    .withMessage('ID de orden inválido')
    .optional()
];

/**
 * Validador para la confirmación de un pago
 */
exports.confirmPaymentValidator = [
  body('paymentIntentId')
    .isString()
    .withMessage('ID de intent de pago inválido')
    .notEmpty()
    .withMessage('Se requiere el ID del intent de pago')
];

/**
 * Validador para añadir un método de pago
 */
exports.addPaymentMethodValidator = [
  body('paymentMethodId')
    .isString()
    .withMessage('ID de método de pago inválido')
    .notEmpty()
    .withMessage('Se requiere el ID del método de pago'),
    
  body('setDefault')
    .isBoolean()
    .withMessage('setDefault debe ser un valor booleano')
    .optional()
];

/**
 * Validador para eliminar un método de pago
 */
exports.removePaymentMethodValidator = [
  param('paymentMethodId')
    .isString()
    .withMessage('ID de método de pago inválido')
    .notEmpty()
    .withMessage('Se requiere el ID del método de pago')
];

/**
 * Validador para procesar un reembolso
 */
exports.createRefundValidator = [
  body('paymentIntentId')
    .isString()
    .withMessage('ID de intent de pago inválido')
    .notEmpty()
    .withMessage('Se requiere el ID del intent de pago'),
    
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser un número mayor que cero')
    .optional(),
    
  body('reason')
    .isIn(['requested_by_customer', 'duplicate', 'fraudulent', 'abandoned'])
    .withMessage('Razón de reembolso inválida')
    .optional()
];
