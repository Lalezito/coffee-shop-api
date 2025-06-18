const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/payment.model');

/**
 * Servicio para manejar operaciones relacionadas con Stripe
 */
class StripeService {
  /**
   * Crea un cliente de Stripe para un usuario
   * @param {Object} userData - Datos del usuario
   * @param {String} userData.email - Email del usuario
   * @param {String} userData.name - Nombre del usuario
   * @returns {Promise<String>} ID del cliente en Stripe
   */
  async createCustomer(userData) {
    try {
      const { email, name } = userData;

      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId: userData.id || userData._id
        }
      });

      return customer.id;
    } catch (error) {
      console.error('Error al crear cliente en Stripe:', error);
      throw new Error(`Error al crear cliente en Stripe: ${error.message}`);
    }
  }

  /**
   * Recupera un cliente de Stripe por su ID
   * @param {String} customerId - ID del cliente en Stripe
   * @returns {Promise<Object>} Datos del cliente
   */
  async getCustomer(customerId) {
    try {
      return await stripe.customers.retrieve(customerId);
    } catch (error) {
      console.error('Error al obtener cliente de Stripe:', error);
      throw new Error(`Error al obtener cliente de Stripe: ${error.message}`);
    }
  }

  /**
   * Crea una intención de pago en Stripe
   * @param {Object} paymentData - Datos del pago
   * @param {Number} paymentData.amount - Monto en centavos
   * @param {String} paymentData.currency - Moneda (ej. 'mxn')
   * @param {String} paymentData.customerId - ID del cliente en Stripe
   * @param {String} paymentData.paymentMethodId - ID del método de pago (opcional)
   * @param {Boolean} paymentData.setupFutureUsage - Guardar método para uso futuro
   * @returns {Promise<Object>} Datos de la intención de pago
   */
  async createPaymentIntent(paymentData) {
    try {
      const { amount, currency, customerId, paymentMethodId, setupFutureUsage } = paymentData;

      const paymentIntentParams = {
        amount,
        currency,
        customer: customerId,
        payment_method_types: ['card'],
        metadata: {
          integration_check: 'coffee_shop_api'
        },
        receipt_email: paymentData.email
      };

      if (paymentMethodId) {
        paymentIntentParams.payment_method = paymentMethodId;
        paymentIntentParams.confirm = true;
        paymentIntentParams.off_session = paymentData.offSession || false;
      }

      if (setupFutureUsage) {
        paymentIntentParams.setup_future_usage = 'off_session';
      }

      // Crear la intención de pago
      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      return paymentIntent;
    } catch (error) {
      console.error('Error al crear intención de pago en Stripe:', error);
      throw new Error(`Error al crear intención de pago en Stripe: ${error.message}`);
    }
  }

  /**
   * Confirma una intención de pago en Stripe
   * @param {String} paymentIntentId - ID de la intención de pago
   * @param {String} paymentMethodId - ID del método de pago
   * @returns {Promise<Object>} Resultado de la confirmación
   */
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
      return await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });
    } catch (error) {
      console.error('Error al confirmar la intención de pago en Stripe:', error);
      throw new Error(`Error al confirmar la intención de pago en Stripe: ${error.message}`);
    }
  }

  /**
   * Captura una intención de pago previamente autorizada
   * @param {String} paymentIntentId - ID de la intención de pago
   * @returns {Promise<Object>} Resultado de la captura
   */
  async capturePaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.capture(paymentIntentId);
    } catch (error) {
      console.error('Error al capturar la intención de pago en Stripe:', error);
      throw new Error(`Error al capturar la intención de pago en Stripe: ${error.message}`);
    }
  }

  /**
   * Cancela una intención de pago
   * @param {String} paymentIntentId - ID de la intención de pago
   * @returns {Promise<Object>} Resultado de la cancelación
   */
  async cancelPaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      console.error('Error al cancelar la intención de pago en Stripe:', error);
      throw new Error(`Error al cancelar la intención de pago en Stripe: ${error.message}`);
    }
  }

  /**
   * Guarda un método de pago para un cliente
   * @param {String} customerId - ID del cliente en Stripe
   * @param {String} paymentMethodId - ID del método de pago
   * @returns {Promise<Object>} Método de pago adjuntado
   */
  async attachPaymentMethod(customerId, paymentMethodId) {
    try {
      // Primero adjuntamos el método de pago al cliente
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      
      // Luego establecemos este método como predeterminado
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      return await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error) {
      console.error('Error al guardar método de pago en Stripe:', error);
      throw new Error(`Error al guardar método de pago en Stripe: ${error.message}`);
    }
  }

  /**
   * Elimina un método de pago de un cliente
   * @param {String} paymentMethodId - ID del método de pago
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async detachPaymentMethod(paymentMethodId) {
    try {
      return await stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      console.error('Error al eliminar método de pago en Stripe:', error);
      throw new Error(`Error al eliminar método de pago en Stripe: ${error.message}`);
    }
  }

  /**
   * Obtiene los métodos de pago de un cliente
   * @param {String} customerId - ID del cliente en Stripe
   * @returns {Promise<Array>} Métodos de pago del cliente
   */
  async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      
      return paymentMethods.data;
    } catch (error) {
      console.error('Error al obtener métodos de pago de Stripe:', error);
      throw new Error(`Error al obtener métodos de pago de Stripe: ${error.message}`);
    }
  }

  /**
   * Procesa un pago con ApplePay
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} Resultado del pago
   */
  async processApplePay(paymentData) {
    try {
      // En el backend, Apple Pay se maneja como una tarjeta normal
      // El token de Apple Pay se envía como paymentMethodId
      return await this.createPaymentIntent({
        ...paymentData,
        setupFutureUsage: false
      });
    } catch (error) {
      console.error('Error al procesar pago con Apple Pay:', error);
      throw new Error(`Error al procesar pago con Apple Pay: ${error.message}`);
    }
  }

  /**
   * Guarda el registro de pago en nuestra base de datos
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} Registro de pago creado
   */
  async savePaymentRecord(paymentData) {
    try {
      const {
        userId,
        orderId,
        stripePaymentIntentId,
        stripeCustomerId,
        amount,
        currency,
        status,
        paymentMethod,
        paymentMethodId,
        last4,
        cardBrand,
        receiptUrl,
        metadata,
        errorMessage
      } = paymentData;

      const payment = new Payment({
        userId,
        orderId,
        stripePaymentIntentId,
        stripeCustomerId,
        amount,
        currency,
        status,
        paymentMethod,
        paymentMethodId,
        last4,
        cardBrand,
        receiptUrl,
        metadata,
        errorMessage
      });

      return await payment.save();
    } catch (error) {
      console.error('Error al guardar registro de pago:', error);
      throw new Error(`Error al guardar registro de pago: ${error.message}`);
    }
  }

  /**
   * Actualiza el estado de un pago en nuestra base de datos
   * @param {String} paymentIntentId - ID de la intención de pago
   * @param {String} status - Nuevo estado
   * @returns {Promise<Object>} Registro de pago actualizado
   */
  async updatePaymentStatus(paymentIntentId, status, errorMessage = null) {
    try {
      const updateData = { status };
      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      return await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId },
        { $set: updateData },
        { new: true }
      );
    } catch (error) {
      console.error('Error al actualizar estado de pago:', error);
      throw new Error(`Error al actualizar estado de pago: ${error.message}`);
    }
  }

  /**
   * Procesa un pago con tarjeta
   * @param {Object} paymentData - Datos completos para el pago
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processCardPayment(paymentData) {
    try {
      const { userId, amount, currency, customerId, paymentMethodId, saveCard, email, metadata = {} } = paymentData;
      
      // 1. Crear la intención de pago en Stripe
      const paymentIntent = await this.createPaymentIntent({
        amount,
        currency,
        customerId,
        paymentMethodId,
        setupFutureUsage: saveCard,
        email,
        offSession: !!paymentMethodId // Si tenemos paymentMethodId, esto es un pago off-session
      });
      
      // 2. Extraer información de la tarjeta si está disponible
      let cardInfo = {};
      if (paymentIntent.payment_method) {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentIntent.payment_method
        );
        if (paymentMethod.card) {
          cardInfo = {
            last4: paymentMethod.card.last4,
            cardBrand: paymentMethod.card.brand
          };
        }
      }
      
      // 3. Guardar el registro del pago en nuestra base de datos
      await this.savePaymentRecord({
        userId,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customerId,
        amount,
        currency,
        status: paymentIntent.status,
        paymentMethod: 'card',
        paymentMethodId: paymentIntent.payment_method,
        receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
        metadata: {
          ...metadata,
          saveCard
        },
        ...cardInfo
      });
      
      // 4. Devolver la respuesta adecuada según el estado del pago
      return {
        success: ['succeeded', 'processing'].includes(paymentIntent.status),
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        message: this._getPaymentStatusMessage(paymentIntent.status)
      };
    } catch (error) {
      console.error('Error al procesar pago con tarjeta:', error);
      
      // Si hay un ID de intención de pago en el error, actualizamos su estado
      if (error.payment_intent?.id) {
        await this.updatePaymentStatus(
          error.payment_intent.id, 
          'failed',
          error.message
        );
      }
      
      throw new Error(`Error al procesar pago con tarjeta: ${error.message}`);
    }
  }

  /**
   * Método privado para obtener un mensaje basado en el estado del pago
   * @private
   */
  _getPaymentStatusMessage(status) {
    const messages = {
      succeeded: 'Pago procesado exitosamente',
      processing: 'Procesando pago...',
      requires_payment_method: 'Se requiere un método de pago',
      requires_confirmation: 'Pago requiere confirmación',
      requires_action: 'Se requiere acción adicional para completar el pago',
      canceled: 'Pago cancelado',
      failed: 'Error al procesar el pago'
    };
    
    return messages[status] || 'Estado de pago desconocido';
  }

  /**
   * Procesa un webhook de Stripe
   * @param {String} signature - Firma del evento
   * @param {Object} rawBody - Cuerpo crudo del evento
   * @returns {Promise<Object>} Resultado del procesamiento del webhook
   */
  async handleWebhook(signature, rawBody) {
    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      // Manejar diferentes tipos de eventos
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this._handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this._handlePaymentIntentFailed(event.data.object);
          break;
        // Añadir más manejadores según sea necesario
      }
      
      return { received: true, type: event.type };
    } catch (error) {
      console.error('Error al procesar webhook de Stripe:', error);
      throw new Error(`Error al procesar webhook de Stripe: ${error.message}`);
    }
  }
  
  /**
   * Maneja un evento de pago exitoso
   * @private
   */
  async _handlePaymentIntentSucceeded(paymentIntent) {
    await this.updatePaymentStatus(paymentIntent.id, 'succeeded');
    // TODO: IMPLEMENTAR REALMENTE - Notificar al usuario, actualizar orden, etc.
  }
  
  /**
   * Maneja un evento de pago fallido
   * @private
   */
  async _handlePaymentIntentFailed(paymentIntent) {
    await this.updatePaymentStatus(
      paymentIntent.id,
      'failed',
      paymentIntent.last_payment_error?.message || 'Pago fallido'
    );
    // TODO: IMPLEMENTAR REALMENTE - Notificar al usuario, actualizar orden, etc.
  }
}

module.exports = new StripeService();
