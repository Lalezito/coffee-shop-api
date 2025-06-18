// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth.middleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// Obtener el carrito del usuario
router.get('/:userId', cartController.getCart);

// Añadir un producto al carrito
router.post('/add', cartController.addItemToCart);

// Actualizar un producto en el carrito
router.put('/update', cartController.updateCartItem);

// Eliminar un producto del carrito
router.delete('/:userId/items/:itemId', cartController.removeItemFromCart);

// Vaciar el carrito
router.delete('/:userId', cartController.clearCart);

// Aplicar un código de descuento
router.post('/discount', cartController.applyDiscount);

// Eliminar un descuento
router.delete('/:userId/discount', cartController.removeDiscount);

// Guardar un producto para más tarde
router.post('/:userId/save/:itemId', cartController.saveForLater);

// Mover un producto de "guardado para más tarde" al carrito
router.post('/:userId/move/:itemId', cartController.moveToCart);

// Eliminar un producto de "guardado para más tarde"
router.delete('/:userId/saved/:itemId', cartController.removeFromSaved);

module.exports = router;