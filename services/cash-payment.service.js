// services/cash-payment.service.js
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

class CashPaymentService {
  /**
   * Registra un pago en efectivo
   * @param {Object} paymentData - Datos del pago
   * @returns {Object} - Resultado del registro
   */
  async registerPayment(paymentData) {
    try {
      const { amount, currency, orderId, userId } = paymentData;
      
      // TODO: IMPLEMENTAR REALMENTE - Integrar con sistema de punto de venta si es necesario
      
      // Generar un ID de transacción único
      const transactionId = `cash_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Actualizar el estado de la orden
      try {
        const order = await Order.findOne({ orderId });
        if (order) {
          order.paymentStatus = 'pending'; // El pago en efectivo se marca como pendiente hasta confirmación
          order.paymentMethod = 'cash';
          order.paymentDetails = {
            transactionId,
            amount,
            currency,
            date: new Date(),
            status: 'pending'
          };
          
          await order.save();
        }
      } catch (orderError) {
        Sentry.captureException(orderError);
        console.error('Error al actualizar orden con pago en efectivo:', orderError);
      }
      
      // Registrar en sistema de facturación si es necesario
      // TODO: IMPLEMENTAR REALMENTE - Integrar con sistema de facturación
      
      return {
        success: true,
        transactionId,
        status: 'pending',
        message: 'Pago en efectivo registrado. Se confirmará al recibir el pago físico.'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al registrar pago en efectivo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirma un pago en efectivo (por ejemplo, cuando se recibe físicamente)
   * @param {String} transactionId - ID de la transacción
   * @returns {Object} - Resultado de la confirmación
   */
  async confirmPayment(transactionId) {
    try {
      // TODO: IMPLEMENTAR REALMENTE - Integrar con sistema de punto de venta si es necesario
      
      // Actualizar el estado de la orden
      const orderUpdated = await Order.findOneAndUpdate(
        { 'paymentDetails.transactionId': transactionId },
        { 
          $set: { 
            paymentStatus: 'paid',
            'paymentDetails.status': 'completed',
            'paymentDetails.confirmedAt': new Date()
          } 
        },
        { new: true }
      );
      
      if (!orderUpdated) {
        return {
          success: false,
          error: 'No se encontró la orden asociada a esta transacción'
        };
      }
      
      return {
        success: true,
        orderId: orderUpdated.orderId,
        status: 'completed',
        message: 'Pago en efectivo confirmado'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al confirmar pago en efectivo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancela un pago en efectivo pendiente
   * @param {String} transactionId - ID de la transacción
   * @param {String} reason - Razón de la cancelación
   * @returns {Object} - Resultado de la cancelación
   */
  async cancelPayment(transactionId, reason) {
    try {
      // TODO: IMPLEMENTAR REALMENTE - Integrar con sistema de punto de venta si es necesario
      
      // Actualizar el estado de la orden
      const orderUpdated = await Order.findOneAndUpdate(
        { 'paymentDetails.transactionId': transactionId },
        { 
          $set: { 
            paymentStatus: 'cancelled',
            'paymentDetails.status': 'cancelled',
            'paymentDetails.cancelledAt': new Date(),
            'paymentDetails.cancellationReason': reason || 'No especificado'
          } 
        },
        { new: true }
      );
      
      if (!orderUpdated) {
        return {
          success: false,
          error: 'No se encontró la orden asociada a esta transacción'
        };
      }
      
      return {
        success: true,
        orderId: orderUpdated.orderId,
        status: 'cancelled',
        message: 'Pago en efectivo cancelado'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al cancelar pago en efectivo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new CashPaymentService();