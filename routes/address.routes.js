// routes/address.routes.js
const express = require('express');
const router = express.Router();
const addressController = require('../controllers/address.controller');
const authenticate = require('../middleware/authenticate');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate.verifyToken);

// Obtener todas las direcciones de un usuario
router.get('/user/:userId', addressController.getAddresses);

// Obtener una dirección específica
router.get('/user/:userId/:addressId', addressController.getAddressById);

// Crear una nueva dirección
router.post('/user/:userId', addressController.createAddress);

// Actualizar una dirección existente
router.put('/user/:userId/:addressId', addressController.updateAddress);

// Eliminar una dirección
router.delete('/user/:userId/:addressId', addressController.deleteAddress);

// Establecer una dirección como predeterminada
router.put('/user/:userId/:addressId/default', addressController.setDefaultAddress);

module.exports = router;