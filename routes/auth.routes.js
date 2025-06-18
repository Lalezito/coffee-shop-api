const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

// Registrar un nuevo usuario
router.post('/register', AuthController.register);

// Iniciar sesión
router.post('/login', AuthController.login);

// Obtener información del usuario actual
router.get('/me', AuthController.getCurrentUser);

module.exports = router;
