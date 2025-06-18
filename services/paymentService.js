// services/paymentService.js
const User = require('../models/user.model');
const stripeService = require('./stripeService');

/**
 * Procesa un pago con tarjeta o Apple Pay
 * @param {Object} paymentData - Datos completos para procesar el pago
 * @returns {Promise<Object>} - Resultado del procesamiento del pago
 */
exports.processPayment = async (paymentData) => {
  try {
    const {
      userId,
      amount,
      currency = 'mxn',
      paymentMethodId,
      paymentOptionType,
      saveCard = false
    } = paymentData;

    // Obtener el usuario
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Obtener o crear cliente de Stripe
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await stripeService.createCustomer({
        id: user._id,
        email: user.email,
        name: user.name
      });
      
      // Guardar ID de cliente en el usuario
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Procesar según el tipo de pago
    if (paymentOptionType === 'applePay') {
      return await stripeService.processApplePay({
        userId: user._id,
        amount,
        currency,
        customerId,
        email: user.email
      });
    } else {
      // Pago con tarjeta (nueva o guardada)
      return await stripeService.processCardPayment({
        userId: user._id,
        amount,
        currency,
        customerId,
        paymentMethodId,
        saveCard,
        email: user.email,
        metadata: {
          paymentOptionType
        }
      });
    }
  } catch (error) {
    console.error('Error en processPayment:', error);
    throw new Error(`Error al procesar el pago: ${error.message}`);
  }
};

/**
 * Guarda un método de pago para un usuario
 * @param {Object} methodData - Datos del método de pago
 * @returns {Promise<Object>} - Método de pago guardado
 */
exports.savePaymentMethod = async (methodData) => {
  try {
    const { userId, paymentMethodId } = methodData;
    
    // Obtener el usuario
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Verificar si el usuario tiene un customerId de Stripe
    if (!user.stripeCustomerId) {
      const customerId = await stripeService.createCustomer({
        id: user._id,
        email: user.email,
        name: user.name
      });
      
      user.stripeCustomerId = customerId;
      await user.save();
    }
    
    // Adjuntar el método de pago al cliente
    const paymentMethod = await stripeService.attachPaymentMethod(
      user.stripeCustomerId,
      paymentMethodId
    );
    
    // Transformar la respuesta
    return {
      success: true,
      methodId: paymentMethod.id,
      last4: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
      expiryMonth: paymentMethod.card?.exp_month,
      expiryYear: paymentMethod.card?.exp_year
    };
  } catch (error) {
    console.error('Error en savePaymentMethod:', error);
    throw new Error(`Error al guardar método de pago: ${error.message}`);
  }
};

/**
 * Obtiene los métodos de pago guardados de un usuario
 * @param {String} userId - ID del usuario
 * @returns {Promise<Array>} - Lista de métodos de pago
 */
exports.getPaymentMethods = async (userId) => {
  try {
    // Obtener el usuario
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Si el usuario no tiene customerId, devolver array vacío
    if (!user.stripeCustomerId) {
      return [];
    }
    
    // Obtener métodos de pago de Stripe
    const methods = await stripeService.getPaymentMethods(user.stripeCustomerId);
    
    // Transformar la respuesta
    return methods.map(method => ({
      id: method.id,
      type: 'card',
      last4: method.card.last4,
      brand: method.card.brand,
      expiryMonth: method.card.exp_month,
      expiryYear: method.card.exp_year,
      isDefault: method.id === user.defaultPaymentMethodId
    }));
  } catch (error) {
    console.error('Error en getPaymentMethods:', error);
    throw new Error(`Error al obtener métodos de pago: ${error.message}`);
  }
};

/**
 * Elimina un método de pago
 * @param {String} methodId - ID del método de pago
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
exports.deletePaymentMethod = async (methodId) => {
  try {
    // Eliminar método de pago en Stripe
    await stripeService.detachPaymentMethod(methodId);
    return { success: true };
  } catch (error) {
    console.error('Error en deletePaymentMethod:', error);
    throw new Error(`Error al eliminar método de pago: ${error.message}`);
  }
};

/**
 * Procesa un pago con Apple Pay
 * @param {Object} paymentData - Datos del pago
 * @returns {Promise<Object>} Resultado del pago
 */
exports.processApplePayment = async (paymentData) => {
  try {
    return await exports.processPayment({
      ...paymentData,
      paymentOptionType: 'applePay'
    });
  } catch (error) {
    console.error('Error en processApplePayment:', error);
    throw new Error(`Error al procesar pago con Apple Pay: ${error.message}`);
  }
};
