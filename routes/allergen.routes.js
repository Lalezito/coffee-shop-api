const express = require('express');
const router = express.Router();
const allergenController = require('../controllers/allergen.controller');
const { authenticate } = require("../middleware/auth.middleware");

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route GET /api/allergens
 * @desc Obtener todos los alérgenos disponibles
 * @access Private
 */
router.get('/', allergenController.getAllAllergens);

/**
 * @route POST /api/allergens
 * @desc Crear un nuevo alérgeno (solo admin)
 * @access Admin
 */
router.post('/', allergenController.createAllergen);

/**
 * @route PUT /api/allergens/:id
 * @desc Actualizar un alérgeno existente (solo admin)
 * @access Admin
 */
router.put('/:id', allergenController.updateAllergen);

/**
 * @route DELETE /api/allergens/:id
 * @desc Eliminar un alérgeno (solo admin)
 * @access Admin
 */
router.delete('/:id', allergenController.deleteAllergen);

/**
 * @route GET /api/allergens/user/:userId
 * @desc Obtener la configuración de alérgenos de un usuario
 * @access Private
 */
router.get('/user/:userId', allergenController.getUserAllergens);

/**
 * @route PUT /api/allergens/user/:userId
 * @desc Actualizar la configuración de alérgenos de un usuario
 * @access Private
 */
router.put('/user/:userId', allergenController.updateUserAllergens);

/**
 * @route GET /api/allergens/user/:userId/check/:productId
 * @desc Verificar si un producto es seguro para un usuario específico
 * @access Private
 */
router.get('/user/:userId/check/:productId', allergenController.checkProductSafety);

module.exports = router;
