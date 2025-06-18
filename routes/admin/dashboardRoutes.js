/**
 * Rutas para el panel de administración
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const { authenticate } = require("../../middleware/auth.middleware");
const roleMiddleware = require('../../middleware/role.middleware');

// Todas las rutas requieren autenticación y rol de administrador
router.use(authenticate, roleMiddleware.isAdmin);

// Rutas para el dashboard
router.get('/stats', dashboardController.getDashboardStats);
router.get('/sales/weekly', dashboardController.getWeeklySalesChart);
router.get('/products/bestsellers', dashboardController.getBestSellingProducts);
router.get('/products/lowstock', dashboardController.getLowStockProducts);

// Ruta para registrar visualización de producto (implementación real)
router.post('/products/:productId/view', dashboardController.recordProductView);

module.exports = router;