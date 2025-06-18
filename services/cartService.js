// services/cartService.js
const Cart = require('../models/cart.model');
const mongoose = require('mongoose');

/**
 * Obtiene el carrito de un usuario o crea uno nuevo si no existe
 */
exports.getCart = async (userId) => {
  try {
    if (!userId) {
      throw new Error('Se requiere el ID del usuario');
    }

    let cart = await Cart.findOne({ userId });
    
    // Si no existe un carrito, crear uno nuevo
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        subtotal: 0,
        total: 0
      });
      await cart.save();
    }
    
    return cart;
  } catch (error) {
    console.error('Error al obtener el carrito:', error);
    throw error;
  }
};

/**
 * Añade un producto al carrito
 */
exports.addItemToCart = async (itemData) => {
  try {
    const { userId, productId, productName, price, quantity, size, image, customizations } = itemData;
    
    if (!userId || !productId || !productName || price == null || !quantity) {
      throw new Error('Faltan datos requeridos para añadir al carrito');
    }
    
    let cart = await Cart.findOne({ userId });
    
    // Si no existe un carrito, crear uno nuevo
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    
    // Verificar si el producto ya existe en el carrito
    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId && item.size === size
    );
    
    if (existingItemIndex > -1) {
      // Actualizar cantidad si el producto ya existe
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].customizations = customizations || cart.items[existingItemIndex].customizations;
    } else {
      // Añadir nuevo producto al carrito
      cart.items.push({
        productId,
        productName,
        price,
        quantity,
        size: size || 'medium',
        image: image || null,
        customizations: customizations || [],
        addedAt: new Date()
      });
    }
    
    await cart.save();
    return cart;
  } catch (error) {
    console.error('Error al añadir item al carrito:', error);
    throw error;
  }
};

/**
 * Actualiza un producto en el carrito
 */
exports.updateCartItem = async (itemData) => {
  try {
    const { userId, itemId, quantity, customizations } = itemData;
    
    if (!userId || !itemId) {
      throw new Error('Se requiere userId e itemId para actualizar');
    }
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      throw new Error('Carrito no encontrado');
    }
    
    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Producto no encontrado en el carrito');
    }
    
    // Actualizar cantidad si se proporciona
    if (quantity !== undefined) {
      if (quantity <= 0) {
        // Si la cantidad es 0 o menos, eliminar el producto
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
    }
    
    // Actualizar personalizaciones si se proporcionan
    if (customizations) {
      cart.items[itemIndex].customizations = customizations;
    }
    
    await cart.save();
    return cart;
  } catch (error) {
    console.error('Error al actualizar item del carrito:', error);
    throw error;
  }
};

/**
 * Elimina un producto del carrito
 */
exports.removeItemFromCart = async (userId, itemId) => {
  try {
    if (!userId || !itemId) {
      throw new Error('Se requiere userId e itemId');
    }
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      throw new Error('Carrito no encontrado');
    }
    
    // Filtrar para eliminar el producto con el ID específico
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    
    if (cart.items.length === initialLength) {
      throw new Error('Producto no encontrado en el carrito');
    }
    
    await cart.save();
    return cart;
  } catch (error) {
    console.error('Error al eliminar item del carrito:', error);
    throw error;
  }
};

/**
 * Vacía el carrito
 */
exports.clearCart = async (userId) => {
  try {
    if (!userId) {
      throw new Error('Se requiere userId');
    }
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      throw new Error('Carrito no encontrado');
    }
    
    cart.items = [];
    cart.discountCode = null;
    cart.discountAmount = 0;
    
    await cart.save();
    return { success: true, message: 'Carrito vaciado correctamente' };
  } catch (error) {
    console.error('Error al vaciar el carrito:', error);
    throw error;
  }
};

/**
 * Aplica un código de descuento al carrito
 */
exports.applyDiscount = async (userId, discountCode, discountAmount) => {
  try {
    if (!userId || !discountCode || discountAmount === undefined) {
      throw new Error('Se requiere userId, discountCode y discountAmount');
    }
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      throw new Error('Carrito no encontrado');
    }
    
    cart.discountCode = discountCode;
    cart.discountAmount = discountAmount;
    
    await cart.save();
    return cart;
  } catch (error) {
    console.error('Error al aplicar descuento:', error);
    throw error;
  }
};

/**
 * Elimina un descuento del carrito
 */
exports.removeDiscount = async (userId) => {
  try {
    if (!userId) {
      throw new Error('Se requiere userId');
    }
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      throw new Error('Carrito no encontrado');
    }
    
    cart.discountCode = null;
    cart.discountAmount = 0;
    
    await cart.save();
    return cart;
  } catch (error) {
    console.error('Error al eliminar descuento:', error);
    throw error;
  }
};

/**
 * Guarda un producto para más tarde
 */
exports.saveForLater = async (userId, itemId) => {
  try {
    if (!userId || !itemId) {
      throw new Error('Se requiere userId e itemId');
    }
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      throw new Error('Carrito no encontrado');
    }
    
    // Encontrar el producto en el carrito
    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Producto no encontrado en el carrito');
    }
    
    // Guardar el producto para más tarde
    const item = cart.items[itemIndex];
    cart.savedForLater.push(item);
    
    // Eliminar del carrito
    cart.items.splice(itemIndex, 1);
    
    await cart.save();
    return cart;
  } catch (error) {
    console.error('Error al guardar para más tarde:', error);
    throw error;
  }
};

/**
 * Mueve un producto de "guardado para más tarde" al carrito
 */
exports.moveToCart = async (userId, itemId) => {
  try {
    if (!userId || !itemId) {
      throw new Error('Se requiere userId e itemId');
    }
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      throw new Error('Carrito no encontrado');
    }
    
    // Encontrar el producto en "guardado para más tarde"
    const itemIndex = cart.savedForLater.findIndex(item => item._id.toString() === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Producto no encontrado en guardados');
    }
    
    // Mover el producto al carrito
    const item = cart.savedForLater[itemIndex];
    
    // Verificar si ya existe en el carrito
    const existingItemIndex = cart.items.findIndex(
      cartItem => cartItem.productId === item.productId && cartItem.size === item.size
    );
    
    if (existingItemIndex > -1) {
      // Si ya existe, incrementar la cantidad
      cart.items[existingItemIndex].quantity += item.quantity;
    } else {
      // Si no existe, añadirlo al carrito
      cart.items.push(item);
    }
    
    // Eliminar de "guardado para más tarde"
    cart.savedForLater.splice(itemIndex, 1);
    
    await cart.save();
    return cart;
  } catch (error) {
    console.error('Error al mover al carrito:', error);
    throw error;
  }
};

/**
 * Elimina un producto de "guardado para más tarde"
 */
exports.removeFromSaved = async (userId, itemId) => {
  try {
    if (!userId || !itemId) {
      throw new Error('Se requiere userId e itemId');
    }
    
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      throw new Error('Carrito no encontrado');
    }
    
    // Filtrar para eliminar el producto
    const initialLength = cart.savedForLater.length;
    cart.savedForLater = cart.savedForLater.filter(item => item._id.toString() !== itemId);
    
    if (cart.savedForLater.length === initialLength) {
      throw new Error('Producto no encontrado en guardados');
    }
    
    await cart.save();
    return cart;
  } catch (error) {
    console.error('Error al eliminar de guardados:', error);
    throw error;
  }
};