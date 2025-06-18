const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controller');
const { authenticate, checkRole } = require('../middleware/auth.middleware');

/**
 * Rutas para la gestión de promociones
 * 
 * Rutas públicas:
 *   - GET /api/promotions/active
 *   - GET /api/promotions/highlighted
 * 
 * Rutas protegidas (requieren autenticación y rol de administrador):
 *   - GET /api/promotions
 *   - GET /api/promotions/:id
 *   - POST /api/promotions
 *   - PATCH /api/promotions/:id
 *   - DELETE /api/promotions/:id
 *   - PATCH /api/promotions/:id/toggle
 */

// Rutas públicas
router.get('/active', promotionController.getActivePromotions);
router.get('/highlighted', promotionController.getHighlightedPromotions);

// Rutas protegidas (solo para administradores)
router.get('/', authenticate, checkRole(['admin']), promotionController.getAllPromotions);
router.get('/:id', authenticate, checkRole(['admin']), promotionController.getPromotionById);
router.post('/', authenticate, checkRole(['admin']), promotionController.createPromotion);
router.patch('/:id', authenticate, checkRole(['admin']), promotionController.updatePromotion);
router.delete('/:id', authenticate, checkRole(['admin']), promotionController.deletePromotion);
router.patch('/:id/toggle', authenticate, checkRole(['admin']), promotionController.togglePromotionStatus);

module.exports = router;
