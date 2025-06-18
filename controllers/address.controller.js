// controllers/address.controller.js
const addressService = require('../services/addressService');

/**
 * Obtiene todas las direcciones de un usuario
 */
exports.getAddresses = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del usuario'
      });
    }
    
    const addresses = await addressService.getAddresses(userId);
    
    res.status(200).json({
      success: true,
      data: addresses
    });
  } catch (error) {
    console.error('Error en getAddresses controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener direcciones'
    });
  }
};

/**
 * Obtiene una dirección específica por su ID
 */
exports.getAddressById = async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    
    if (!userId || !addressId) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren userId y addressId'
      });
    }
    
    const address = await addressService.getAddressById(userId, addressId);
    
    res.status(200).json({
      success: true,
      data: address
    });
  } catch (error) {
    console.error('Error en getAddressById controller:', error);
    res.status(error.message.includes('no encontrad') ? 404 : 500).json({
      success: false,
      message: error.message || 'Error al obtener dirección'
    });
  }
};

/**
 * Crea una nueva dirección para un usuario
 */
exports.createAddress = async (req, res) => {
  try {
    const userId = req.params.userId;
    const addressData = req.body;
    
    if (!userId || !addressData) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren userId y datos de dirección'
      });
    }
    
    // Validar datos mínimos requeridos
    const requiredFields = ['street', 'city', 'state', 'postalCode'];
    for (const field of requiredFields) {
      if (!addressData[field]) {
        return res.status(400).json({
          success: false,
          message: `El campo ${field} es obligatorio`
        });
      }
    }
    
    const newAddress = await addressService.saveAddress(userId, addressData);
    
    res.status(201).json({
      success: true,
      message: 'Dirección creada correctamente',
      data: newAddress
    });
  } catch (error) {
    console.error('Error en createAddress controller:', error);
    res.status(error.message.includes('no encontrad') ? 404 : 500).json({
      success: false,
      message: error.message || 'Error al crear dirección'
    });
  }
};

/**
 * Actualiza una dirección existente
 */
exports.updateAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    const addressData = req.body;
    
    if (!userId || !addressId || !addressData) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren userId, addressId y datos de dirección'
      });
    }
    
    const updatedAddress = await addressService.updateAddress(userId, addressId, addressData);
    
    res.status(200).json({
      success: true,
      message: 'Dirección actualizada correctamente',
      data: updatedAddress
    });
  } catch (error) {
    console.error('Error en updateAddress controller:', error);
    res.status(error.message.includes('no encontrad') ? 404 : 500).json({
      success: false,
      message: error.message || 'Error al actualizar dirección'
    });
  }
};

/**
 * Elimina una dirección
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    
    if (!userId || !addressId) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren userId y addressId'
      });
    }
    
    await addressService.deleteAddress(userId, addressId);
    
    res.status(200).json({
      success: true,
      message: 'Dirección eliminada correctamente'
    });
  } catch (error) {
    console.error('Error en deleteAddress controller:', error);
    res.status(error.message.includes('no encontrad') ? 404 : 500).json({
      success: false,
      message: error.message || 'Error al eliminar dirección'
    });
  }
};

/**
 * Establece una dirección como predeterminada
 */
exports.setDefaultAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    
    if (!userId || !addressId) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren userId y addressId'
      });
    }
    
    const updatedAddress = await addressService.setDefaultAddress(userId, addressId);
    
    res.status(200).json({
      success: true,
      message: 'Dirección establecida como predeterminada',
      data: updatedAddress
    });
  } catch (error) {
    console.error('Error en setDefaultAddress controller:', error);
    res.status(error.message.includes('no encontrad') ? 404 : 500).json({
      success: false,
      message: error.message || 'Error al establecer dirección predeterminada'
    });
  }
};