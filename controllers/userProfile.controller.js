const User = require('../models/user.model');

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
 * Gestión de direcciones del usuario
 */

// Agregar dirección
exports.addAddress = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.userId;
    const { name, street, city, zipCode, isDefault } = req.body;

    if (!name || !street || !city || !zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos de dirección son requeridos'
      });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear nueva dirección
    const newAddress = {
      name,
      street,
      city,
      zipCode,
      isDefault: isDefault || false
    };

    // Si es la dirección predeterminada, actualizar las demás
    if (newAddress.isDefault) {
      user.addresses.forEach(address => {
        address.isDefault = false;
      });
    }

    // Si es la primera dirección, marcarla como predeterminada
    if (user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Dirección agregada exitosamente',
      data: {
        address: newAddress
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al agregar dirección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar dirección',
      error: error.message
    });
  }
};

// Actualizar dirección
exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.userId;
    const { addressId } = req.params;
    const { name, street, city, zipCode, isDefault } = req.body;

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Encontrar la dirección a actualizar
    const addressIndex = user.addresses.findIndex(
      addr => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Dirección no encontrada'
      });
    }

    // Actualizar campos
    if (name) user.addresses[addressIndex].name = name;
    if (street) user.addresses[addressIndex].street = street;
    if (city) user.addresses[addressIndex].city = city;
    if (zipCode) user.addresses[addressIndex].zipCode = zipCode;
    
    // Si se marca como predeterminada, actualizar las demás
    if (isDefault) {
      user.addresses.forEach((address, index) => {
        address.isDefault = (index === addressIndex);
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Dirección actualizada exitosamente',
      data: {
        address: user.addresses[addressIndex]
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al actualizar dirección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar dirección',
      error: error.message
    });
  }
};

// Eliminar dirección
exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.userId;
    const { addressId } = req.params;

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Encontrar y eliminar la dirección
    const addressIndex = user.addresses.findIndex(
      addr => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Dirección no encontrada'
      });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // Si era la dirección predeterminada, establecer otra como predeterminada
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Dirección eliminada exitosamente'
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al eliminar dirección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar dirección',
      error: error.message
    });
  }
};

/**
 * Gestión de Métodos de Pago en MongoDB 
 * (nota: los métodos de pago reales se manejan con Stripe en payment.controller.js)
 */

// Obtener métodos de pago del usuario
exports.getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.userId;
    
    const user = await User.findOne({ userId }).select('paymentMethods');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        paymentMethods: user.paymentMethods || []
      }
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

// Establecer método de pago predeterminado
exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.sub || req.user.userId;
    const { paymentMethodId } = req.params;

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Encontrar el método de pago
    const paymentMethodIndex = user.paymentMethods.findIndex(
      method => method._id.toString() === paymentMethodId
    );

    if (paymentMethodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Método de pago no encontrado'
      });
    }

    // Actualizar isDefault en todos los métodos de pago
    user.paymentMethods.forEach((method, index) => {
      method.isDefault = (index === paymentMethodIndex);
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Método de pago predeterminado actualizado',
      data: {
        paymentMethod: user.paymentMethods[paymentMethodIndex]
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al establecer método de pago predeterminado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al establecer método de pago predeterminado',
      error: error.message
    });
  }
};
