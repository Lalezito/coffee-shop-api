// controllers/cartController.js
const cartService = require('../services/cartService');

/**
 * Obtiene el carrito del usuario
 */
exports.getCart = async (req, res) => {
  try {
    const cart = await cartService.getCart(req.params.userId);
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Error en getCart controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al obtener el carrito' 
    });
  }
};

/**
 * Añade un producto al carrito
 */
exports.addItemToCart = async (req, res) => {
  try {
    const cartData = {
      userId: req.body.userId,
      productId: req.body.productId,
      productName: req.body.productName,
      price: req.body.price,
      quantity: req.body.quantity || 1,
      size: req.body.size,
      image: req.body.image,
      customizations: req.body.customizations
    };
    
    const updatedCart = await cartService.addItemToCart(cartData);
    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Producto añadido al carrito'
    });
  } catch (error) {
    console.error('Error en addItemToCart controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al añadir producto al carrito' 
    });
  }
};

/**
 * Actualiza un producto en el carrito
 */
exports.updateCartItem = async (req, res) => {
  try {
    const cartData = {
      userId: req.body.userId,
      itemId: req.body.itemId,
      quantity: req.body.quantity,
      customizations: req.body.customizations
    };
    
    const updatedCart = await cartService.updateCartItem(cartData);
    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Producto actualizado en el carrito'
    });
  } catch (error) {
    console.error('Error en updateCartItem controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al actualizar producto en el carrito' 
    });
  }
};

/**
 * Elimina un producto del carrito
 */
exports.removeItemFromCart = async (req, res) => {
  try {
    const updatedCart = await cartService.removeItemFromCart(req.params.userId, req.params.itemId);
    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Producto eliminado del carrito'
    });
  } catch (error) {
    console.error('Error en removeItemFromCart controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al eliminar producto del carrito' 
    });
  }
};

/**
 * Vacía el carrito
 */
exports.clearCart = async (req, res) => {
  try {
    await cartService.clearCart(req.params.userId);
    res.status(200).json({
      success: true,
      message: 'Carrito vaciado correctamente'
    });
  } catch (error) {
    console.error('Error en clearCart controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al vaciar el carrito' 
    });
  }
};

/**
 * Aplica un código de descuento al carrito
 */
exports.applyDiscount = async (req, res) => {
  try {
    const { userId, discountCode, discountAmount } = req.body;
    
    if (!userId || !discountCode || discountAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere userId, discountCode y discountAmount'
      });
    }
    
    const updatedCart = await cartService.applyDiscount(userId, discountCode, discountAmount);
    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Descuento aplicado correctamente'
    });
  } catch (error) {
    console.error('Error en applyDiscount controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al aplicar descuento' 
    });
  }
};

/**
 * Elimina un descuento del carrito
 */
exports.removeDiscount = async (req, res) => {
  try {
    const updatedCart = await cartService.removeDiscount(req.params.userId);
    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Descuento eliminado correctamente'
    });
  } catch (error) {
    console.error('Error en removeDiscount controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al eliminar descuento' 
    });
  }
};

/**
 * Guarda un producto para más tarde
 */
exports.saveForLater = async (req, res) => {
  try {
    const updatedCart = await cartService.saveForLater(req.params.userId, req.params.itemId);
    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Producto guardado para más tarde'
    });
  } catch (error) {
    console.error('Error en saveForLater controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al guardar producto para más tarde' 
    });
  }
};

/**
 * Mueve un producto de "guardado para más tarde" al carrito
 */
exports.moveToCart = async (req, res) => {
  try {
    const updatedCart = await cartService.moveToCart(req.params.userId, req.params.itemId);
    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Producto movido al carrito'
    });
  } catch (error) {
    console.error('Error en moveToCart controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al mover producto al carrito' 
    });
  }
};

/**
 * Elimina un producto de "guardado para más tarde"
 */
exports.removeFromSaved = async (req, res) => {
  try {
    const updatedCart = await cartService.removeFromSaved(req.params.userId, req.params.itemId);
    res.status(200).json({
      success: true,
      data: updatedCart,
      message: 'Producto eliminado de guardados'
    });
  } catch (error) {
    console.error('Error en removeFromSaved controller:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al eliminar producto de guardados' 
    });
  }
};