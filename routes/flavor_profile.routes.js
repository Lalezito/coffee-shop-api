const express = require('express');
const router = express.Router();
const flavorProfileController = require('../controllers/flavor_profile.controller');
const { authenticate } = require("../middleware/auth.middleware");

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/flavor-profiles/:userId
 * @desc Obtener el perfil de sabor de un usuario
 * @access Private
 */
router.get('/:userId', flavorProfileController.getUserFlavorProfile);

/**
 * @route PUT /api/flavor-profiles/:userId
 * @desc Actualizar el perfil de sabor de un usuario
 * @access Private
 */
router.put('/:userId', flavorProfileController.updateFlavorProfile);

/**
 * @route GET /api/flavor-profiles/:userId/recommendations
 * @desc Obtener recomendaciones basadas en el perfil de sabor
 * @access Private
 */
router.get('/:userId/recommendations', flavorProfileController.getRecommendations);

/**
 * @route GET /api/flavor-profiles/:userId/compatibility/:productId
 * @desc Calcular compatibilidad de un producto con el perfil de sabor
 * @access Private
 */
router.get('/:userId/compatibility/:productId', flavorProfileController.calculateProductCompatibility);

module.exports = router;
