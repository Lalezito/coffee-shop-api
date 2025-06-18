// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Ruta para crear un nuevo pedido
router.post('/', orderController.createOrder);

// Ruta para obtener un pedido por ID
router.get('/:orderId', orderController.getOrderById);

// Ruta para actualizar el estado de un pedido
router.put('/:orderId/status', orderController.updateOrderStatus);

// Ruta para obtener el historial de pedidos de un usuario
router.get('/history/:userId', orderController.getOrderHistory);

// TODO: conectar con el archivo principal de rutas (ej. index.js o app.js)

module.exports = router;
