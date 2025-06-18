// controllers/payment-methods.controller.js
const { validationResult } = require('express-validator');
const ApplePayService = require('../services/apple-pay.service');
const PayPalService = require('../services/paypal.service');
const CashPaymentService = require('../services/cash-payment.service');
const User = require('../models/user.model');
const Order = require('../models/order.model');

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  // Si Sentry no está disponible, creamos un mock
  Sentry = {
    captureException: (err) => console.error('Sentry no disponible:', err)
  };
}

/**
 * Verificar si Apple Pay está soportado
 */
exports.checkApplePaySupport = async (req, res) => {
  try {
    const result = await ApplePayService.isSupported();
    
    res.status(200).json({
      success: result.success,
      isSupported: result.isSupported
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al verificar soporte de Apple Pay:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar soporte de Apple Pay',
      error: error.message
    });
  }
};

/**
 * Procesar pago con Apple Pay
 */
exports.processApplePay = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, currency, orderId, token } = req.body;
    const userId = req.user.userId;

    // Buscar usuario
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Procesar pago con Apple Pay
    const result = await ApplePayService.processPayment({
      amount,
      currency,
      orderId,
      token,
      customerId: user.stripeCustomerId
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al procesar pago con Apple Pay',
        error: result.error
      });
    }

    // Actualizar la orden con la información del pago
    try {
      const order = await Order.findOne({ orderId });
      if (order) {
        order.paymentStatus = 'processing';
        order.paymentMethod = 'apple_pay';
        order.paymentDetails = {
          paymentIntentId: result.paymentIntentId,
          amount,
          currency,
          date: new Date(),
          status: result.status
        };
        
        await order.save();
      }
    } catch (orderError) {
      // Registramos el error pero continuamos porque el pago ya se procesó
      Sentry.captureException(orderError);
      console.error('Error al actualizar orden tras pago con Apple Pay:', orderError);
    }

    res.status(200).json({
      success: true,
      paymentIntentId: result.paymentIntentId,
      clientSecret: result.clientSecret,
      status: result.status
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al procesar pago con Apple Pay:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar pago con Apple Pay',
      error: error.message
    });
  }
};

/**
 * Iniciar pago con PayPal
 */
exports.initiatePayPal = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, currency, orderId } = req.body;
    const userId = req.user.userId;
    
    // Configurar URLs de retorno
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const returnUrl = `${baseUrl}/api/payments/paypal/capture?orderId=${orderId}`;
    const cancelUrl = `${baseUrl}/api/payments/paypal/cancel?orderId=${orderId}`;

    // Iniciar pago con PayPal
    const result = await PayPalService.createOrder({
      amount,
      currency,
      orderId,
      returnUrl,
      cancelUrl
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al iniciar pago con PayPal',
        error: result.error
      });
    }

    // Actualizar la orden con la información de PayPal
    try {
      const order = await Order.findOne({ orderId });
      if (order) {
        order.paymentStatus = 'awaiting_payment';
        order.paymentMethod = 'paypal';
        order.paymentDetails = {
          paypalOrderId: result.orderId,
          amount,
          currency,
          date: new Date(),
          status: result.status
        };
        
        await order.save();
      }
    } catch (orderError) {
      // Registramos el error pero continuamos porque el pago ya se inició
      Sentry.captureException(orderError);
      console.error('Error al actualizar orden tras iniciar pago con PayPal:', orderError);
    }

    res.status(200).json({
      success: true,
      paypalOrderId: result.orderId,
      approvalUrl: result.approvalUrl,
      status: result.status
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al iniciar pago con PayPal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar pago con PayPal',
      error: error.message
    });
  }
};

/**
 * Capturar pago de PayPal después de aprobación del usuario
 */
exports.capturePayPal = async (req, res) => {
  try {
    const { paypalOrderId } = req.query;
    
    // Capturar pago de PayPal
    const result = await PayPalService.capturePayment(paypalOrderId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al capturar pago de PayPal',
        error: result.error
      });
    }

    // Actualizar la orden con la información de captura
    try {
      const order = await Order.findOneAndUpdate(
        { 'paymentDetails.paypalOrderId': paypalOrderId },
        { 
          $set: { 
            paymentStatus: 'paid',
            'paymentDetails.status': result.status,
            'paymentDetails.transactionId': result.transactionId,
            'paymentDetails.payerId': result.payerId,
            'paymentDetails.payerEmail': result.payerEmail,
            'paymentDetails.capturedAt': new Date()
          } 
        },
        { new: true }
      );
      
      if (!order) {
        console.warn(`No se encontró orden con paypalOrderId ${paypalOrderId}`);
      }
    } catch (orderError) {
      // Registramos el error pero continuamos porque el pago ya se capturó
      Sentry.captureException(orderError);
      console.error('Error al actualizar orden tras capturar pago de PayPal:', orderError);
    }

    // Redirigir al usuario a la página de éxito
    res.redirect(`/checkout/success?orderId=${order.orderId}`);
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al capturar pago de PayPal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al capturar pago de PayPal',
      error: error.message
    });
  }
};

/**
 * Cancelar pago de PayPal
 */
exports.cancelPayPal = async (req, res) => {
  try {
    const { orderId } = req.query;
    
    // Actualizar la orden como cancelada
    try {
      const order = await Order.findOneAndUpdate(
        { orderId },
        { 
          $set: { 
            paymentStatus: 'cancelled',
            'paymentDetails.status': 'cancelled',
            'paymentDetails.cancelledAt': new Date()
          } 
        },
        { new: true }
      );
      
      if (!order) {
        console.warn(`No se encontró orden con ID ${orderId}`);
      }
    } catch (orderError) {
      Sentry.captureException(orderError);
      console.error('Error al actualizar orden tras cancelar pago de PayPal:', orderError);
    }

    // Redirigir al usuario a la página de cancelación
    res.redirect(`/checkout?cancelled=true&orderId=${orderId}`);
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al cancelar pago de PayPal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar pago de PayPal',
      error: error.message
    });
  }
};

/**
 * Registrar pago en efectivo
 */
exports.processCashPayment = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, currency, orderId } = req.body;
    const userId = req.user.userId;

    // Registrar pago en efectivo
    const result = await CashPaymentService.registerPayment({
      amount,
      currency,
      orderId,
      userId
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al registrar pago en efectivo',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      message: result.message
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al registrar pago en efectivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar pago en efectivo',
      error: error.message
    });
  }
};

/**
 * Confirmar pago en efectivo (para uso de administradores)
 */
exports.confirmCashPayment = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { transactionId } = req.body;
    
    // Confirmar pago en efectivo
    const result = await CashPaymentService.confirmPayment(transactionId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al confirmar pago en efectivo',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      orderId: result.orderId,
      status: result.status,
      message: result.message
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al confirmar pago en efectivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar pago en efectivo',
      error: error.message
    });
  }
};