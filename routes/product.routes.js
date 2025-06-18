const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
// TODO: IMPLEMENTAR REALMENTE - Middleware de autenticación para proteger rutas de administrador
const { protect, adminOnly } = require('../middleware/auth'); // Asumo que existe este middleware

// Rutas públicas
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Rutas protegidas para administradores
// Gestión de productos (CRUD)
router.post('/', protect, adminOnly, productController.createProduct);
router.put('/:id', protect, adminOnly, productController.updateProduct);
router.delete('/:id', protect, adminOnly, productController.deleteProduct);
router.patch('/:id/stock', protect, adminOnly, productController.updateProductStock);

// Rutas para estadísticas y reportes
router.get('/stats/low-stock', protect, adminOnly, productController.getLowStockProducts);
router.get('/stats/best-selling', protect, adminOnly, productController.getBestSellingProducts);

module.exports = router;
