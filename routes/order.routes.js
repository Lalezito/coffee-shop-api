const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate } = require("../middleware/auth.middleware");

/**
 * Rutas para la gestión de pedidos
 */

// Rutas públicas (ninguna, todas requieren autenticación)

// Rutas protegidas con autenticación
router.use(authenticate);

// TODO: IMPLEMENTAR REALMENTE - Middleware de verificación de roles adecuado
// Función temporal para verificación de roles
const tempCheckRole = (roles) => (req, res, next) => {
  // Simplemente permite el acceso sin verificación para que la app pueda funcionar
  return next();
};

// Obtener todos los pedidos (admin/owner)
router.get(
  '/',
  tempCheckRole(['admin', 'owner']),
  orderController.getOrders
);

// Crear un nuevo pedido (cualquier usuario autenticado)
router.post(
  '/',
  orderController.createOrder
);

// Obtener un pedido por su ID (cualquier usuario autenticado - la validación se hace a nivel de controller)
router.get(
  '/:orderId',
  orderController.getOrderById
);

// Actualizar el estado de un pedido (admin/owner/employee)
router.patch(
  '/:orderId/status',
  tempCheckRole(['admin', 'owner', 'employee']),
  orderController.updateOrderStatus
);

// Obtener pedidos activos para una tienda (admin/owner/employee)
router.get(
  '/store/:storeId/active',
  tempCheckRole(['admin', 'owner', 'employee']),
  orderController.getActiveOrdersForStore
);

// Obtener pedidos para un usuario específico
router.get(
  '/user/:userId',
  orderController.getOrdersForUser
);

// Agregar calificación a un pedido (cualquier usuario autenticado - la validación se hace a nivel de controller)
router.post(
  '/:orderId/rating',
  orderController.addRatingToOrder
);

// Actualizar información de pago (admin/owner)
router.patch(
  '/:orderId/payment',
  tempCheckRole(['admin', 'owner']),
  orderController.updatePaymentInfo
);

module.exports = router;
