// controllers/paymentController.js
const paymentService = require('../services/paymentService');
const stripeService = require('../services/stripeService');
const Payment = require('../models/payment.model');
const { StatusCodes } = require('http-status-codes');

/**
 * Procesa un pago estándar (con tarjeta)
 */
exports.processPayment = async (req, res) => {
  try {
    const result = await paymentService.processPayment(req.body);
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('Error al procesar pago:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error al procesar el pago'
    });
  }
};

/**
 * Procesa un pago específicamente con Apple Pay
 */
exports.processApplePayment = async (req, res) => {
  try {
    const result = await paymentService.processApplePayment(req.body);
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('Error al procesar pago con Apple Pay:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error al procesar el pago con Apple Pay'
    });
  }
};

/**
 * Guarda un método de pago para un usuario
 */
exports.savePaymentMethod = async (req, res) => {
  try {
    const result = await paymentService.savePaymentMethod(req.body);
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('Error al guardar método de pago:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error al guardar el método de pago'
    });
  }
};

/**
 * Obtiene los métodos de pago guardados de un usuario
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = await paymentService.getPaymentMethods(req.params.userId);
    res.status(StatusCodes.OK).json(methods);
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error al obtener los métodos de pago'
    });
  }
};

/**
 * Elimina un método de pago
 */
exports.deletePaymentMethod = async (req, res) => {
  try {
    await paymentService.deletePaymentMethod(req.params.methodId);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    console.error('Error al eliminar método de pago:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error al eliminar el método de pago'
    });
  }
};

/**
 * Crea un cliente de Stripe para un usuario
 */
exports.createStripeCustomer = async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;
    
    if (!userData.email || !userData.name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Se requiere email y nombre para crear un cliente'
      });
    }
    
    const customerId = await stripeService.createCustomer({
      id: userId,
      ...userData
    });
    
    res.status(StatusCodes.CREATED).json({
      success: true,
      customerId
    });
  } catch (error) {
    console.error('Error al crear cliente en Stripe:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error al crear cliente en Stripe'
    });
  }
};

/**
 * Webhook para manejar eventos de Stripe
 */
exports.handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const rawBody = req.rawBody; // Asegúrate de configurar Express para obtener el cuerpo raw
  
  try {
    const result = await stripeService.handleWebhook(signature, rawBody);
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error('Error al procesar webhook de Stripe:', error);
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || 'Error al procesar webhook de Stripe'
    });
  }
};

/**
 * Obtiene el historial de pagos de un usuario
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { userId };
    if (status) {
      query.status = status;
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: 'orderId'
    };
    
    const payments = await Payment.paginate(query, options);
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error al obtener historial de pagos'
    });
  }
};

/**
 * Obtiene los detalles de un pago específico
 */
exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findById(paymentId).populate('orderId');
    if (!payment) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error al obtener detalles del pago:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error al obtener detalles del pago'
    });
  }
};
