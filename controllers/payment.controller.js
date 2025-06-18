const User = require('../models/user.model');
const StripeService = require('../services/stripe.service');
const { validationResult } = require('express-validator');

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
 * Crear intención de pago
 */
exports.createPaymentIntent = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, currency, orderId } = req.body;
    const userId = req.user.userId;

    // Buscar usuario
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el usuario tiene customerId de Stripe
    let customerId = user.stripeCustomerId;
    
    // Si no tiene, crear cliente en Stripe
    if (!customerId) {
      const customerResult = await StripeService.createCustomer({
        userId,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      });
      
      if (!customerResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Error al crear cliente en Stripe',
          error: customerResult.error
        });
      }
      
      customerId = customerResult.customerId;
      user.stripeCustomerId = customerId;
      await user.save();
    }
    
    // Determinar el método de pago a usar
    const paymentMethodId = req.body.paymentMethodId || 
                           (user.paymentMethods?.find(m => m.isDefault)?.stripePaymentMethodId);
    
    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un método de pago'
      });
    }

    // Crear PaymentIntent
    const paymentIntent = await StripeService.createPaymentIntent({
      amount,
      currency,
      customerId,
      paymentMethodId,
      metadata: {
        orderId,
        userId
      }
    });

    if (!paymentIntent.success) {
      return res.status(500).json({
        success: false,
        message: 'Error al crear intención de pago',
        error: paymentIntent.error
      });
    }

    res.status(200).json({
      success: true,
      paymentIntent: {
        id: paymentIntent.paymentIntentId,
        clientSecret: paymentIntent.clientSecret,
        status: paymentIntent.status,
        requiresAction: paymentIntent.requiresAction,
        nextAction: paymentIntent.nextAction
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al crear intención de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear intención de pago',
      error: error.message
    });
  }
};

/**
 * Confirmar un pago después de una acción del usuario (3D Secure)
 */
exports.confirmPayment = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { paymentIntentId } = req.body;

    const result = await StripeService.confirmPaymentIntent(paymentIntentId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Error al confirmar pago',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      status: result.status,
      requiresAction: result.requiresAction,
      nextAction: result.nextAction
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al confirmar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar pago',
      error: error.message
    });
  }
};

/**
 * Añadir un método de pago al usuario
 */
exports.addPaymentMethod = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { paymentMethodId, setDefault } = req.body;
    const userId = req.user.userId;

    // Buscar usuario
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el usuario tiene customerId de Stripe
    let customerId = user.stripeCustomerId;
    
    // Si no tiene, crear cliente en Stripe
    if (!customerId) {
      const customerResult = await StripeService.createCustomer({
        userId,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      });
      
      if (!customerResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Error al crear cliente en Stripe',
          error: customerResult.error
        });
      }
      
      customerId = customerResult.customerId;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Añadir método de pago
    const result = await StripeService.addPaymentMethod({
      customerId,
      paymentMethodId
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Error al añadir método de pago',
        error: result.error
      });
    }

    // Actualizar métodos de pago del usuario
    const paymentMethod = result.paymentMethod;
    const newPaymentMethod = {
      type: paymentMethod.type === 'card' ? 'credit' : 'debit', // Asumimos crédito por defecto
      last4: paymentMethod.last4,
      brand: paymentMethod.brand,
      isDefault: setDefault === true,
      stripePaymentMethodId: paymentMethod.id
    };

    // Si se marca como predeterminado, actualizar los otros métodos
    if (setDefault === true) {
      user.paymentMethods.forEach(method => {
        method.isDefault = false;
      });
      newPaymentMethod.isDefault = true;
    }

    // Agregar el nuevo método de pago
    user.paymentMethods.push(newPaymentMethod);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Método de pago añadido correctamente',
      paymentMethod: newPaymentMethod
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al añadir método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al añadir método de pago',
      error: error.message
    });
  }
};

/**
 * Obtener métodos de pago del usuario
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Buscar usuario
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si no tiene métodos de pago, devolver array vacío
    if (!user.paymentMethods || user.paymentMethods.length === 0) {
      return res.status(200).json({
        success: true,
        paymentMethods: []
      });
    }

    res.status(200).json({
      success: true,
      paymentMethods: user.paymentMethods
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener métodos de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métodos de pago',
      error: error.message
    });
  }
};

/**
 * Eliminar un método de pago
 */
exports.removePaymentMethod = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { paymentMethodId } = req.params;
    const userId = req.user.userId;

    // Buscar usuario
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que el método de pago existe
    const methodIndex = user.paymentMethods.findIndex(
      method => method.stripePaymentMethodId === paymentMethodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Método de pago no encontrado'
      });
    }

    // Eliminar método de pago en Stripe
    const result = await StripeService.removePaymentMethod(paymentMethodId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar método de pago',
        error: result.error
      });
    }

    // Eliminar método de pago del usuario
    user.paymentMethods.splice(methodIndex, 1);
    
    // Si el método eliminado era el predeterminado y hay otros métodos, establecer uno nuevo como predeterminado
    if (user.paymentMethods.length > 0 && user.paymentMethods[methodIndex]?.isDefault) {
      user.paymentMethods[0].isDefault = true;
    }
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Método de pago eliminado correctamente'
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al eliminar método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar método de pago',
      error: error.message
    });
  }
};

/**
 * Procesar un reembolso
 */
exports.createRefund = async (req, res) => {
  // Validación de entrada
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { paymentIntentId, amount, reason, metadata } = req.body;
    const userId = req.user.userId;

    // Procesar el reembolso usando el servicio de Stripe
    const result = await StripeService.createRefund({
      paymentIntentId,
      amount,
      reason,
      metadata: {
        ...metadata,
        userId,
        refundedBy: 'api',
        timestamp: new Date().toISOString()
      }
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Error al procesar reembolso',
        error: result.error
      });
    }

    // Si existe un ID de orden, actualizar el estado de la orden
    if (req.body.orderId) {
      try {
        const Order = require('../models/order.model');
        const order = await Order.findById(req.body.orderId);
        
        if (order) {
          // Verificar si es reembolso total o parcial
          const isFullRefund = !amount || amount >= order.totalAmount;
          
          order.paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';
          order.refundedAmount = isFullRefund ? order.totalAmount : amount;
          order.refundReason = reason || 'requested_by_customer';
          order.lastUpdated = new Date();
          
          if (!order.refunds) order.refunds = [];
          order.refunds.push({
            refundId: result.refundId,
            amount: result.amount,
            reason: reason || 'requested_by_customer',
            date: new Date()
          });
          
          await order.save();
        }
      } catch (orderError) {
        // Registramos el error pero continuamos porque el reembolso ya se realizó
        Sentry.captureException(orderError);
        console.error('Error al actualizar orden tras reembolso:', orderError);
      }
    }

    res.status(200).json({
      success: true,
      refundId: result.refundId,
      status: result.status,
      amount: result.amount
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al procesar reembolso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar reembolso',
      error: error.message
    });
  }
};

/**
 * Procesar webhook de Stripe
 * Maneja los eventos de Stripe como pagos exitosos, fallidos, reembolsos y cambios en suscripciones
 */
exports.handleWebhook = async (req, res) => {
  try {
    // Verificar la firma del webhook para asegurar que la solicitud viene de Stripe
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    // Validación de seguridad y procesamiento de eventos implementado en StripeService
    const result = await StripeService.handleWebhook(payload, signature);

    if (!result.success) {
      console.error('Error al procesar webhook:', result.error);
      return res.status(400).json({ success: false, message: result.error });
    }

    // Stripe espera una respuesta 200 con un objeto simple para confirmar la recepción
    res.status(200).json({ received: true, type: result.type });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al procesar webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar webhook',
      error: error.message
    });
  }
};
