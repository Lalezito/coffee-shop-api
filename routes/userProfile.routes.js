const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfile.controller');
const { authenticate } = require("../middleware/auth.middleware");
const { body, param } = require('express-validator');

// Validadores de direcciones
const validateAddress = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('street').notEmpty().withMessage('La calle es requerida'),
  body('city').notEmpty().withMessage('La ciudad es requerida'),
  body('zipCode').notEmpty().withMessage('El código postal es requerido'),
  body('isDefault').optional().isBoolean().withMessage('isDefault debe ser un valor booleano')
];

const validateAddressId = [
  param('addressId').notEmpty().withMessage('ID de dirección es requerido')
];

const validatePaymentMethodId = [
  param('paymentMethodId').notEmpty().withMessage('ID de método de pago es requerido')
];

// TODO: IMPLEMENTAR REALMENTE - Implementación completa de perfiles de usuario

// Rutas de direcciones 
router.post('/addresses', authenticate, validateAddress, userProfileController.addAddress);
router.patch('/addresses/:addressId', authenticate, validateAddressId, userProfileController.updateAddress);
router.delete('/addresses/:addressId', authenticate, validateAddressId, userProfileController.deleteAddress);

// Rutas de métodos de pago (vista en MongoDB)
router.get('/payment-methods', authenticate, userProfileController.getPaymentMethods);
router.patch('/payment-methods/:paymentMethodId/default', authenticate, validatePaymentMethodId, userProfileController.setDefaultPaymentMethod);

// Ruta para obtener perfil completo del usuario
router.get('/', authenticate, (req, res) => {
  try {
    // TODO: IMPLEMENTAR REALMENTE - Obtener datos reales del perfil
    const userId = req.user.userId;
    
    res.status(200).json({
      success: true,
      data: {
        userId: userId,
        name: 'Usuario Ejemplo',
        email: req.user.email || 'usuario@ejemplo.com',
        preferences: {
          favoriteProducts: [],
          notificationsEnabled: true,
          emailNotifications: true
        },
        memberSince: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
});

module.exports = router;
