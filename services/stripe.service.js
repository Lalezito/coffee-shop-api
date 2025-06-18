// Inicializar Stripe solo si hay clave disponible
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY no configurada. Servicios de pago deshabilitados.');
}
let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  // Si Sentry no está disponible, creamos un mock
  Sentry = {
    captureException: (err) => console.error('Sentry no disponible:', err),
    captureMessage: (msg) => console.warn('Sentry no disponible:', msg)
  };
}

class StripeService {
  /**
   * Verifica si Stripe está disponible
   * @returns {Boolean} True si Stripe está configurado
   */
  isStripeAvailable() {
    return stripe !== null;
  }

  /**
   * Valida que Stripe esté disponible antes de ejecutar operaciones
   * @throws {Error} Si Stripe no está configurado
   */
  _validateStripeAvailable() {
    if (!this.isStripeAvailable()) {
      throw new Error('Stripe no está configurado. Configure STRIPE_SECRET_KEY en las variables de entorno.');
    }
  }

  /**
   * Crear un cliente en Stripe o recuperar uno existente
   * @param {Object} userData - Datos del usuario
   * @returns {Object} - Cliente de Stripe
   */
  async createCustomer(userData) {
    try {
      this._validateStripeAvailable();
      const { email, name, userId, phone, metadata = {} } = userData;
      
      // Verificar si ya existe un cliente con este email o userId
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1
      });
      
      // Si el cliente ya existe, actualizamos sus datos
      if (existingCustomers.data.length > 0) {
        const existingCustomer = existingCustomers.data[0];
        
        // Verificar si el cliente existente ya tiene el mismo userId en metadata
        if (existingCustomer.metadata && existingCustomer.metadata.userId === userId) {
          // Actualizamos datos por si han cambiado
          const updatedCustomer = await stripe.customers.update(existingCustomer.id, {
            name,
            phone,
            metadata: {
              userId,
              ...metadata
            }
          });
          
          return {
            success: true,
            customerId: updatedCustomer.id,
            existingCustomer: true
          };
        }
        
        // Si el usuario existe con email pero el userId no coincide, es un conflicto
        Sentry.captureMessage(`Conflicto de usuarios: email ${email} ya existe con diferente userId`);
        console.warn(`Conflicto: email ${email} ya existe con diferente userId`);
      }
      
      // Crear nuevo cliente
      const customer = await stripe.customers.create({
        email,
        name,
        phone,
        metadata: {
          userId,
          created: new Date().toISOString(),
          appVersion: process.env.APP_VERSION || '1.0.0',
          ...metadata
        }
      });
      
      console.log(`Nuevo cliente Stripe creado: ${customer.id} para usuario ${userId}`);
      
      return {
        success: true,
        customerId: customer.id,
        existingCustomer: false
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al crear/recuperar cliente en Stripe:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Crear un PaymentIntent para procesar un pago
   * @param {Object} paymentData - Datos del pago
   * @returns {Object} - PaymentIntent y estado del proceso
   */
  async createPaymentIntent(paymentData) {
    try {
      const { 
        amount, 
        currency = 'mxn', 
        customerId, 
        paymentMethodId, 
        orderId,
        description,
        receiptEmail,
        statementDescriptor,
        shipping,
        metadata = {},
        setupFutureUsage,
        confirm = true
      } = paymentData;
      
      // Validaciones básicas
      if (!amount || amount <= 0) {
        throw new Error('El monto debe ser mayor que cero');
      }
      
      if (!customerId) {
        throw new Error('Se requiere un ID de cliente (customerId)');
      }
      
      // Preparamos los parámetros del PaymentIntent
      const paymentIntentParams = {
        amount: Math.round(amount * 100), // Stripe usa centavos
        currency: currency.toLowerCase(),
        customer: customerId,
        metadata: {
          orderId: orderId || '',
          createdAt: new Date().toISOString(),
          env: process.env.NODE_ENV || 'development',
          ...metadata
        },
        description: description || 'Compra en Coffee Shop App',
        receipt_email: receiptEmail,
        statement_descriptor: statementDescriptor || 'COFFEE SHOP',
        statement_descriptor_suffix: 'COFFEEAPP',
        confirmation_method: 'manual',
        // Capturamos el pago automáticamente (true) o lo retenemos para captura manual (false)
        capture_method: 'automatic',
        return_url: process.env.PAYMENT_RETURN_URL || 'https://coffeeapp.com/payment-return',
      };
      
      // Configurar method_id si está presente
      if (paymentMethodId) {
        paymentIntentParams.payment_method = paymentMethodId;
        
        // Si setupFutureUsage está habilitado, guardamos el método para futuro uso
        if (setupFutureUsage) {
          paymentIntentParams.setup_future_usage = 'off_session';
        }
      }
      
      // Añadir información de envío si está disponible
      if (shipping) {
        paymentIntentParams.shipping = shipping;
      }
      
      // Verificar si el cliente existe antes de crear el PaymentIntent
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer || customer.deleted) {
        throw new Error(`Cliente no encontrado o eliminado: ${customerId}`);
      }
      
      // Si existe una orden asociada, verificar que no tenga ya un PaymentIntent exitoso
      if (orderId) {
        const Order = require('../models/order.model');
        const order = await Order.findById(orderId);
        
        if (order && order.paymentStatus === 'paid') {
          return {
            success: false,
            error: 'Esta orden ya ha sido pagada',
            alreadyPaid: true,
            existingPaymentIntentId: order.paymentIntentId
          };
        }
      }
      
      // Crear el PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
      console.log(`PaymentIntent creado: ${paymentIntent.id} para cliente ${customerId}`);
      
      // Si se solicita confirmación inmediata, la hacemos
      if (confirm && paymentMethodId) {
        const confirmOptions = {};
        
        // Intentar confirmar el PaymentIntent
        try {
          const confirmedIntent = await stripe.paymentIntents.confirm(
            paymentIntent.id,
            confirmOptions
          );
          
          // Actualizar la referencia del PaymentIntent con el objeto confirmado
          Object.assign(paymentIntent, confirmedIntent);
        } catch (confirmError) {
          // Si hay error en la confirmación, capturamos pero continuamos
          // ya que aún podemos devolver el PaymentIntent creado
          Sentry.captureException(confirmError);
          console.error('Error al confirmar PaymentIntent:', confirmError);
        }
      }
      
      // Actualizar el estado de la orden si existe
      if (orderId) {
        try {
          const Order = require('../models/order.model');
          await Order.findByIdAndUpdate(orderId, {
            paymentIntentId: paymentIntent.id,
            paymentStatus: paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
            lastUpdated: new Date()
          });
        } catch (orderError) {
          // Registrar error pero continuar
          Sentry.captureException(orderError);
          console.error('Error al actualizar orden:', orderError);
        }
      }
      
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        requiresConfirmation: paymentIntent.status === 'requires_confirmation',
        requiresCapture: paymentIntent.status === 'requires_capture',
        nextAction: paymentIntent.next_action,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al crear PaymentIntent:', error);
      
      // Categorizar errores para mejor manejo en el cliente
      let errorType = 'unknown';
      let errorDetail = '';
      
      if (error.type === 'StripeCardError') {
        errorType = 'card_error';
        errorDetail = error.code || '';
      } else if (error.type === 'StripeInvalidRequestError') {
        errorType = 'invalid_request';
      } else if (error.type === 'StripeAuthenticationError') {
        errorType = 'authentication_error';
      }
      
      return {
        success: false,
        error: error.message,
        errorType,
        errorDetail,
        errorCode: error.code || '',
        declineCode: error.decline_code || ''
      };
    }
  }
  
  /**
   * Confirmar un PaymentIntent (después de 3D Secure)
   * @param {string} paymentIntentId - ID del PaymentIntent
   * @returns {Object} - PaymentIntent confirmado
   */
  async confirmPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      
      return {
        success: true,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al confirmar PaymentIntent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Añadir un método de pago a un cliente
   * @param {Object} paymentData - Datos del método de pago
   * @returns {Object} - Método de pago
   */
  async addPaymentMethod(paymentData) {
    try {
      const { customerId, paymentMethodId } = paymentData;
      
      // Adjuntar método de pago al cliente
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      
      // Obtener detalles del método de pago
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      return {
        success: true,
        paymentMethod: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          expiryMonth: paymentMethod.card?.exp_month,
          expiryYear: paymentMethod.card?.exp_year
        }
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al añadir método de pago:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Obtener métodos de pago de un cliente
   * @param {string} customerId - ID del cliente en Stripe
   * @returns {Object} - Lista de métodos de pago
   */
  async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      
      return {
        success: true,
        paymentMethods: paymentMethods.data.map(method => ({
          id: method.id,
          type: method.type,
          brand: method.card?.brand,
          last4: method.card?.last4,
          expiryMonth: method.card?.exp_month,
          expiryYear: method.card?.exp_year
        }))
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al obtener métodos de pago:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Eliminar un método de pago
   * @param {string} paymentMethodId - ID del método de pago
   * @returns {Object} - Resultado de la operación
   */
  async removePaymentMethod(paymentMethodId) {
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
      
      return {
        success: true,
        message: 'Método de pago eliminado correctamente'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al eliminar método de pago:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Procesar un reembolso
   * @param {Object} refundData - Datos del reembolso
   * @returns {Object} - Reembolso procesado
   */
  async createRefund(refundData) {
    try {
      const { paymentIntentId, amount, reason, metadata } = refundData;
      
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Reembolso parcial o total
        reason: reason || 'requested_by_customer',
        metadata: metadata || {}
      });
      
      return {
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar reembolso:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Manejar un webhook de Stripe
   * @param {string} payload - Cuerpo del webhook
   * @param {string} signature - Firma de Stripe
   * @returns {Object} - Evento procesado
   */
  async handleWebhook(payload, signature) {
    try {
      // Verificar firma del webhook para asegurar que la solicitud viene de Stripe
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log(`Webhook recibido: ${event.type}`);
      
      // Procesar según el tipo de evento
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this._handlePaymentIntentSucceeded(event.data.object);
          break;
          
        case 'payment_intent.payment_failed':
          await this._handlePaymentIntentFailed(event.data.object);
          break;
          
        case 'payment_method.attached':
          await this._handlePaymentMethodAttached(event.data.object);
          break;
          
        case 'charge.refunded':
          await this._handleChargeRefunded(event.data.object);
          break;
          
        case 'customer.subscription.created':
          await this._handleSubscriptionCreated(event.data.object);
          break;
          
        case 'customer.subscription.updated':
          await this._handleSubscriptionUpdated(event.data.object);
          break;
          
        case 'customer.subscription.deleted':
          await this._handleSubscriptionCanceled(event.data.object);
          break;
          
        case 'invoice.payment_succeeded':
          await this._handleInvoicePaymentSucceeded(event.data.object);
          break;
          
        case 'invoice.payment_failed':
          await this._handleInvoicePaymentFailed(event.data.object);
          break;
          
        default:
          console.log(`Evento no manejado específicamente: ${event.type}`);
          // Guardamos todos los eventos en la base de datos para análisis
          await this._logWebhookEvent(event);
      }

      return {
        success: true,
        type: event.type,
        id: event.id
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar webhook:', error);
      
      // Log detallado del error para diagnóstico
      console.error({
        error: error.message,
        stack: error.stack,
        signature: signature ? 'Presente' : 'Ausente',
        payloadLength: payload ? payload.length : 0
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Manejar evento de pago exitoso
   * @private
   */
  async _handlePaymentIntentSucceeded(paymentIntent) {
    try {
      // Implementación real para actualizar el estado del pedido
      const { metadata } = paymentIntent;
      const orderId = metadata.orderId;
      
      if (!orderId) {
        console.warn('PaymentIntent sin orderId en metadata:', paymentIntent.id);
        return;
      }
      
      // Actualizar el estado del pedido en la base de datos
      const Order = require('../models/order.model');
      const order = await Order.findById(orderId);
      
      if (!order) {
        console.warn(`Orden ${orderId} no encontrada para el PaymentIntent ${paymentIntent.id}`);
        return;
      }
      
      // Actualizar el estado de la orden
      order.paymentStatus = 'paid';
      order.paymentIntentId = paymentIntent.id;
      order.lastUpdated = new Date();
      await order.save();
      
      // Enviar notificación de pago exitoso al usuario
      const OneSignalService = require('./onesignal.service');
      const User = require('../models/user.model');
      
      const user = await User.findById(order.userId);
      if (user && user.oneSignalPlayerIds && user.oneSignalPlayerIds.length) {
        await OneSignalService.sendToPlayerIds(
          user.oneSignalPlayerIds,
          '¡Pago confirmado!', 
          `Tu pago para la orden #${order.orderNumber} ha sido procesado correctamente.`,
          {
            type: 'payment_success',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber
          }
        );
      }
      
      console.log(`Pago exitoso procesado para orden ${orderId}, PaymentIntent: ${paymentIntent.id}`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar pago exitoso:', error);
    }
  }

  /**
   * Manejar evento de pago fallido
   * @private
   */
  async _handlePaymentIntentFailed(paymentIntent) {
    try {
      // Implementación real para manejar pagos fallidos
      const { metadata, last_payment_error } = paymentIntent;
      const orderId = metadata.orderId;
      
      if (!orderId) {
        console.warn('PaymentIntent fallido sin orderId en metadata:', paymentIntent.id);
        return;
      }
      
      // Actualizar el estado del pedido en la base de datos
      const Order = require('../models/order.model');
      const order = await Order.findById(orderId);
      
      if (!order) {
        console.warn(`Orden ${orderId} no encontrada para el PaymentIntent fallido ${paymentIntent.id}`);
        return;
      }
      
      // Actualizar el estado de la orden con el error
      order.paymentStatus = 'failed';
      order.paymentError = last_payment_error ? last_payment_error.message : 'Error desconocido';
      order.lastUpdated = new Date();
      await order.save();
      
      // Enviar notificación de pago fallido al usuario
      const OneSignalService = require('./onesignal.service');
      const User = require('../models/user.model');
      
      const user = await User.findById(order.userId);
      if (user && user.oneSignalPlayerIds && user.oneSignalPlayerIds.length) {
        await OneSignalService.sendToPlayerIds(
          user.oneSignalPlayerIds,
          'Error en el pago', 
          `Hubo un problema con tu pago para la orden #${order.orderNumber}. Por favor, intenta nuevamente.`,
          {
            type: 'payment_failed',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            error: order.paymentError
          }
        );
      }
      
      console.log(`Pago fallido procesado para orden ${orderId}: ${order.paymentError}`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar pago fallido:', error);
    }
  }

  /**
   * Manejar evento de método de pago adjuntado
   * @private
   */
  async _handlePaymentMethodAttached(paymentMethod) {
    try {
      // Implementación real para sincronizar métodos de pago
      const { customer } = paymentMethod;
      
      if (!customer) {
        console.warn('PaymentMethod sin customer asociado:', paymentMethod.id);
        return;
      }
      
      // Buscar usuario por customerId de Stripe
      const User = require('../models/user.model');
      const user = await User.findOne({ stripeCustomerId: customer });
      
      if (!user) {
        console.warn(`Usuario no encontrado para Stripe Customer ID ${customer}`);
        return;
      }
      
      // Crear objeto para el método de pago
      const newPaymentMethod = {
        type: paymentMethod.type,
        stripePaymentMethodId: paymentMethod.id,
        isDefault: user.paymentMethods.length === 0, // Primer método = predeterminado
      };
      
      // Agregar detalles específicos según el tipo
      if (paymentMethod.type === 'card') {
        newPaymentMethod.brand = paymentMethod.card.brand;
        newPaymentMethod.last4 = paymentMethod.card.last4;
        newPaymentMethod.expiryMonth = paymentMethod.card.exp_month;
        newPaymentMethod.expiryYear = paymentMethod.card.exp_year;
      }
      
      // Agregar a la lista de métodos de pago del usuario
      // Evitar duplicados verificando si ya existe
      const methodExists = user.paymentMethods.some(m => 
        m.stripePaymentMethodId === paymentMethod.id
      );
      
      if (!methodExists) {
        user.paymentMethods.push(newPaymentMethod);
        await user.save();
        console.log(`Método de pago ${paymentMethod.id} agregado al usuario ${user._id}`);
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar nuevo método de pago:', error);
    }
  }
  
  /**
   * Manejar evento de cargo reembolsado
   * @private
   */
  async _handleChargeRefunded(charge) {
    try {
      // Implementación real para reembolsos
      const { payment_intent, metadata, amount_refunded, amount, refunds } = charge;
      
      if (!payment_intent) {
        console.warn('Reembolso sin payment_intent asociado:', charge.id);
        return;
      }
      
      // Buscar pago y orden asociada
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
      const orderId = paymentIntent.metadata.orderId;
      
      if (!orderId) {
        console.warn('Reembolso sin orden asociada:', charge.id);
        return;
      }
      
      // Actualizar el estado del pedido en la base de datos
      const Order = require('../models/order.model');
      const order = await Order.findById(orderId);
      
      if (!order) {
        console.warn(`Orden ${orderId} no encontrada para el reembolso ${charge.id}`);
        return;
      }
      
      // Verificar si es reembolso total o parcial
      const isFullRefund = amount_refunded === amount;
      
      // Actualizar el estado de la orden
      order.paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';
      order.refundedAmount = amount_refunded / 100; // Convertir de centavos
      order.lastUpdated = new Date();
      
      // Guardar detalles de los reembolsos
      if (refunds && refunds.data && refunds.data.length) {
        order.refunds = refunds.data.map(refund => ({
          refundId: refund.id,
          amount: refund.amount / 100,
          reason: refund.reason,
          date: new Date(refund.created * 1000)
        }));
      }
      
      await order.save();
      
      // Enviar notificación de reembolso al usuario
      const OneSignalService = require('./onesignal.service');
      const User = require('../models/user.model');
      
      const user = await User.findById(order.userId);
      if (user && user.oneSignalPlayerIds && user.oneSignalPlayerIds.length) {
        const title = isFullRefund ? 'Reembolso procesado' : 'Reembolso parcial procesado';
        const message = isFullRefund
          ? `Tu reembolso para la orden #${order.orderNumber} ha sido procesado completamente.`
          : `Un reembolso parcial de $${order.refundedAmount.toFixed(2)} para la orden #${order.orderNumber} ha sido procesado.`;
          
        await OneSignalService.sendToPlayerIds(
          user.oneSignalPlayerIds,
          title, 
          message,
          {
            type: 'refund_processed',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            amount: order.refundedAmount
          }
        );
      }
      
      console.log(`Reembolso procesado para orden ${orderId}: $${amount_refunded / 100}`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar reembolso:', error);
    }
  }
  
  /**
   * Manejar evento de suscripción creada
   * @private
   */
  async _handleSubscriptionCreated(subscription) {
    try {
      // Implementación real para suscripciones
      const { customer, metadata, items, status } = subscription;
      
      if (!customer) {
        console.warn('Suscripción sin customer asociado:', subscription.id);
        return;
      }
      
      // Buscar usuario por customerId de Stripe
      const User = require('../models/user.model');
      const user = await User.findOne({ stripeCustomerId: customer });
      
      if (!user) {
        console.warn(`Usuario no encontrado para Stripe Customer ID ${customer}`);
        return;
      }
      
      // Obtener detalles del plan de suscripción
      let planId = null;
      let planName = '';
      
      if (items && items.data && items.data.length) {
        const item = items.data[0];
        planId = item.plan.id;
        
        // Obtener detalles del producto
        const product = await stripe.products.retrieve(item.plan.product);
        planName = product.name;
      }
      
      // Crear objeto para la suscripción
      const newSubscription = {
        stripeSubscriptionId: subscription.id,
        planId,
        planName,
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };
      
      // Agregar a las suscripciones del usuario
      if (!user.subscriptions) {
        user.subscriptions = [];
      }
      
      user.subscriptions.push(newSubscription);
      await user.save();
      
      // Enviar notificación al usuario
      if (user.oneSignalPlayerIds && user.oneSignalPlayerIds.length) {
        const OneSignalService = require('./onesignal.service');
        await OneSignalService.sendToPlayerIds(
          user.oneSignalPlayerIds,
          'Suscripción activada', 
          `¡Tu suscripción a ${planName} ha sido activada correctamente!`,
          {
            type: 'subscription_created',
            subscriptionId: subscription.id,
            planName
          }
        );
      }
      
      console.log(`Suscripción ${subscription.id} creada para usuario ${user._id}`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar creación de suscripción:', error);
    }
  }
  
  /**
   * Manejar evento de suscripción actualizada
   * @private
   */
  async _handleSubscriptionUpdated(subscription) {
    try {
      // Implementación real para actualizaciones de suscripciones
      const { id, customer, status } = subscription;
      
      if (!customer) {
        console.warn('Suscripción sin customer asociado:', id);
        return;
      }
      
      // Buscar usuario por customerId de Stripe
      const User = require('../models/user.model');
      const user = await User.findOne({ stripeCustomerId: customer });
      
      if (!user) {
        console.warn(`Usuario no encontrado para Stripe Customer ID ${customer}`);
        return;
      }
      
      // Actualizar la suscripción existente
      if (!user.subscriptions) {
        user.subscriptions = [];
        console.warn(`Usuario ${user._id} sin suscripciones para actualizar`);
        return;
      }
      
      const subIndex = user.subscriptions.findIndex(s => s.stripeSubscriptionId === id);
      
      if (subIndex === -1) {
        console.warn(`Suscripción ${id} no encontrada para usuario ${user._id}`);
        return;
      }
      
      // Actualizar detalles
      user.subscriptions[subIndex].status = status;
      user.subscriptions[subIndex].currentPeriodStart = new Date(subscription.current_period_start * 1000);
      user.subscriptions[subIndex].currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      user.subscriptions[subIndex].cancelAtPeriodEnd = subscription.cancel_at_period_end;
      
      await user.save();
      console.log(`Suscripción ${id} actualizada para usuario ${user._id}`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar actualización de suscripción:', error);
    }
  }
  
  /**
   * Manejar evento de suscripción cancelada
   * @private
   */
  async _handleSubscriptionCanceled(subscription) {
    try {
      // Implementación real para cancelaciones de suscripciones
      const { id, customer } = subscription;
      
      if (!customer) {
        console.warn('Suscripción sin customer asociado:', id);
        return;
      }
      
      // Buscar usuario por customerId de Stripe
      const User = require('../models/user.model');
      const user = await User.findOne({ stripeCustomerId: customer });
      
      if (!user) {
        console.warn(`Usuario no encontrado para Stripe Customer ID ${customer}`);
        return;
      }
      
      // Actualizar la suscripción existente
      if (!user.subscriptions) {
        console.warn(`Usuario ${user._id} sin suscripciones para cancelar`);
        return;
      }
      
      const subIndex = user.subscriptions.findIndex(s => s.stripeSubscriptionId === id);
      
      if (subIndex === -1) {
        console.warn(`Suscripción ${id} no encontrada para usuario ${user._id}`);
        return;
      }
      
      // Actualizar estado
      user.subscriptions[subIndex].status = 'canceled';
      user.subscriptions[subIndex].canceledAt = new Date();
      
      await user.save();
      
      // Enviar notificación al usuario
      if (user.oneSignalPlayerIds && user.oneSignalPlayerIds.length) {
        const OneSignalService = require('./onesignal.service');
        const planName = user.subscriptions[subIndex].planName || 'Coffee Club';
        
        await OneSignalService.sendToPlayerIds(
          user.oneSignalPlayerIds,
          'Suscripción cancelada', 
          `Tu suscripción a ${planName} ha sido cancelada.`,
          {
            type: 'subscription_canceled',
            subscriptionId: id
          }
        );
      }
      
      console.log(`Suscripción ${id} cancelada para usuario ${user._id}`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar cancelación de suscripción:', error);
    }
  }
  
  /**
   * Manejar evento de factura pagada
   * @private
   */
  async _handleInvoicePaymentSucceeded(invoice) {
    try {
      // Implementación real para facturas pagadas
      const { customer, subscription, paid, amount_paid } = invoice;
      
      if (!customer || !subscription) {
        console.warn('Factura sin customer o suscripción:', invoice.id);
        return;
      }
      
      // Buscar usuario por customerId de Stripe
      const User = require('../models/user.model');
      const user = await User.findOne({ stripeCustomerId: customer });
      
      if (!user) {
        console.warn(`Usuario no encontrado para Stripe Customer ID ${customer}`);
        return;
      }
      
      // Crear entrada para el historial de facturas
      if (!user.billingHistory) {
        user.billingHistory = [];
      }
      
      // Buscar la suscripción asociada
      const userSubscription = user.subscriptions?.find(s => s.stripeSubscriptionId === subscription);
      const planName = userSubscription?.planName || 'Coffee Club';
      
      user.billingHistory.push({
        invoiceId: invoice.id,
        subscriptionId: subscription,
        amount: amount_paid / 100,
        currency: invoice.currency,
        date: new Date(invoice.created * 1000),
        status: paid ? 'paid' : 'unpaid',
        description: `Factura por ${planName}`
      });
      
      await user.save();
      
      // Enviar notificación al usuario solo si está configurado para recibir notificaciones de facturación
      if (user.preferences?.notifications?.orders && user.oneSignalPlayerIds?.length) {
        const OneSignalService = require('./onesignal.service');
        await OneSignalService.sendToPlayerIds(
          user.oneSignalPlayerIds,
          'Factura pagada', 
          `Tu factura por ${planName} de $${(amount_paid / 100).toFixed(2)} ha sido pagada correctamente.`,
          {
            type: 'invoice_paid',
            invoiceId: invoice.id,
            amount: amount_paid / 100
          }
        );
      }
      
      console.log(`Factura ${invoice.id} pagada para usuario ${user._id}`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar factura pagada:', error);
    }
  }
  
  /**
   * Manejar evento de factura con pago fallido
   * @private
   */
  async _handleInvoicePaymentFailed(invoice) {
    try {
      // Implementación real para facturas con pago fallido
      const { customer, subscription, attempt_count } = invoice;
      
      if (!customer || !subscription) {
        console.warn('Factura sin customer o suscripción:', invoice.id);
        return;
      }
      
      // Buscar usuario por customerId de Stripe
      const User = require('../models/user.model');
      const user = await User.findOne({ stripeCustomerId: customer });
      
      if (!user) {
        console.warn(`Usuario no encontrado para Stripe Customer ID ${customer}`);
        return;
      }
      
      // Buscar la suscripción asociada
      const userSubscription = user.subscriptions?.find(s => s.stripeSubscriptionId === subscription);
      const planName = userSubscription?.planName || 'Coffee Club';
      
      // Enviar notificación al usuario
      if (user.oneSignalPlayerIds && user.oneSignalPlayerIds.length) {
        const OneSignalService = require('./onesignal.service');
        const attemptText = attempt_count > 1 ? `(intento ${attempt_count})` : '';
        
        await OneSignalService.sendToPlayerIds(
          user.oneSignalPlayerIds,
          'Problema con tu pago', 
          `No pudimos procesar el pago para tu suscripción a ${planName} ${attemptText}. Por favor, verifica tu método de pago.`,
          {
            type: 'invoice_payment_failed',
            invoiceId: invoice.id,
            attemptCount: attempt_count
          }
        );
      }
      
      console.log(`Factura ${invoice.id} con pago fallido para usuario ${user._id} (intento ${attempt_count})`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al procesar factura con pago fallido:', error);
    }
  }
  
  /**
   * Registrar evento de webhook para análisis
   * @private
   */
  async _logWebhookEvent(event) {
    try {
      // Implementación de registro de eventos para análisis y auditoría
      // Esto permite monitorear y analizar todos los eventos de Stripe
      
      // Creamos un esquema mongoose si no existe
      const mongoose = require('mongoose');
      let WebhookEvent;
      
      try {
        // Intentar obtener el modelo si ya está registrado
        WebhookEvent = mongoose.model('WebhookEvent');
      } catch (e) {
        // Si no existe, crear el modelo
        const webhookEventSchema = new mongoose.Schema({
          eventId: String,
          eventType: String,
          objectId: String,
          objectType: String,
          createdAt: Date,
          data: mongoose.Schema.Types.Mixed,
          processed: Boolean,
          processingErrors: [String]
        }, { timestamps: true });
        
        WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);
      }
      
      // Guardar el evento
      await new WebhookEvent({
        eventId: event.id,
        eventType: event.type,
        objectId: event.data.object.id,
        objectType: event.data.object.object,
        createdAt: new Date(event.created * 1000),
        data: event.data.object,
        processed: true
      }).save();
      
      console.log(`Evento de webhook ${event.id} (${event.type}) registrado correctamente`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al registrar evento de webhook:', error);
    }
  }
}

module.exports = new StripeService();
