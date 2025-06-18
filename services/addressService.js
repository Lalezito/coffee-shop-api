// services/addressService.js
const User = require('../models/user.model');
const mongoose = require('mongoose');

/**
 * Obtiene todas las direcciones de un usuario
 */
exports.getAddresses = async (userId) => {
  try {
    if (!userId) {
      throw new Error('Se requiere el ID del usuario');
    }
    
    const user = await User.findOne({ userId });
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Si el usuario no tiene direcciones, devolver un array vacío
    if (!user.addresses || !Array.isArray(user.addresses)) {
      return [];
    }
    
    return user.addresses;
  } catch (error) {
    console.error('Error al obtener direcciones:', error);
    throw error;
  }
};

/**
 * Obtiene una dirección específica de un usuario
 */
exports.getAddressById = async (userId, addressId) => {
  try {
    if (!userId || !addressId) {
      throw new Error('Se requieren userId y addressId');
    }
    
    const user = await User.findOne({ userId });
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Buscar la dirección específica
    const address = user.addresses?.find(addr => addr._id.toString() === addressId);
    
    if (!address) {
      throw new Error('Dirección no encontrada');
    }
    
    return address;
  } catch (error) {
    console.error('Error al obtener dirección por ID:', error);
    throw error;
  }
};

/**
 * Añade una nueva dirección a un usuario
 */
exports.saveAddress = async (userId, addressData) => {
  try {
    if (!userId || !addressData) {
      throw new Error('Se requieren userId y datos de dirección');
    }
    
    // Validar los datos de la dirección
    const requiredFields = ['street', 'city', 'state', 'postalCode'];
    for (const field of requiredFields) {
      if (!addressData[field]) {
        throw new Error(`El campo ${field} es obligatorio`);
      }
    }
    
    const user = await User.findOne({ userId });
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Inicializar el array de direcciones si no existe
    if (!user.addresses) {
      user.addresses = [];
    }
    
    // Crear una nueva dirección con un ID único
    const newAddress = {
      _id: new mongoose.Types.ObjectId(),
      ...addressData,
      default: addressData.default || false,
      createdAt: new Date()
    };
    
    // Si es la dirección predeterminada, quitar ese estado de las demás
    if (newAddress.default) {
      user.addresses.forEach(addr => {
        addr.default = false;
      });
    }
    
    // Si es la primera dirección, hacerla predeterminada
    if (user.addresses.length === 0) {
      newAddress.default = true;
    }
    
    // Añadir la nueva dirección
    user.addresses.push(newAddress);
    
    await user.save();
    
    return newAddress;
  } catch (error) {
    console.error('Error al guardar dirección:', error);
    throw error;
  }
};

/**
 * Actualiza una dirección existente
 */
exports.updateAddress = async (userId, addressId, addressData) => {
  try {
    if (!userId || !addressId || !addressData) {
      throw new Error('Se requieren userId, addressId y datos de dirección');
    }
    
    const user = await User.findOne({ userId });
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Encontrar el índice de la dirección a actualizar
    const addressIndex = user.addresses?.findIndex(addr => addr._id.toString() === addressId);
    
    if (addressIndex === -1 || addressIndex === undefined) {
      throw new Error('Dirección no encontrada');
    }
    
    // Actualizar los campos proporcionados
    Object.keys(addressData).forEach(key => {
      if (key !== '_id') { // No permitir cambiar el ID
        user.addresses[addressIndex][key] = addressData[key];
      }
    });
    
    // Si se marca como predeterminada, actualizar las demás
    if (addressData.default) {
      user.addresses.forEach((addr, index) => {
        if (index !== addressIndex) {
          addr.default = false;
        }
      });
    }
    
    // Actualizar la fecha de modificación
    user.addresses[addressIndex].updatedAt = new Date();
    
    await user.save();
    
    return user.addresses[addressIndex];
  } catch (error) {
    console.error('Error al actualizar dirección:', error);
    throw error;
  }
};

/**
 * Elimina una dirección
 */
exports.deleteAddress = async (userId, addressId) => {
  try {
    if (!userId || !addressId) {
      throw new Error('Se requieren userId y addressId');
    }
    
    const user = await User.findOne({ userId });
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Verificar si la dirección existe
    const addressIndex = user.addresses?.findIndex(addr => addr._id.toString() === addressId);
    
    if (addressIndex === -1 || addressIndex === undefined) {
      throw new Error('Dirección no encontrada');
    }
    
    // Verificar si es la dirección predeterminada
    const isDefault = user.addresses[addressIndex].default;
    
    // Eliminar la dirección
    user.addresses.splice(addressIndex, 1);
    
    // Si era la predeterminada y quedan direcciones, hacer la primera predeterminada
    if (isDefault && user.addresses.length > 0) {
      user.addresses[0].default = true;
    }
    
    await user.save();
    
    return { success: true, message: 'Dirección eliminada correctamente' };
  } catch (error) {
    console.error('Error al eliminar dirección:', error);
    throw error;
  }
};

/**
 * Establece una dirección como predeterminada
 */
exports.setDefaultAddress = async (userId, addressId) => {
  try {
    if (!userId || !addressId) {
      throw new Error('Se requieren userId y addressId');
    }
    
    const user = await User.findOne({ userId });
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Verificar si la dirección existe
    const addressExists = user.addresses?.some(addr => addr._id.toString() === addressId);
    
    if (!addressExists) {
      throw new Error('Dirección no encontrada');
    }
    
    // Actualizar todas las direcciones
    user.addresses.forEach(addr => {
      addr.default = addr._id.toString() === addressId;
    });
    
    await user.save();
    
    // Obtener la dirección actualizada
    const updatedAddress = user.addresses.find(addr => addr._id.toString() === addressId);
    
    return updatedAddress;
  } catch (error) {
    console.error('Error al establecer dirección predeterminada:', error);
    throw error;
  }
};