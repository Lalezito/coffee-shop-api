const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { authenticate } = require("../middleware/auth.middleware");
const roleMiddleware = require('../middleware/role.middleware');

/**
 * Rutas para la gestión de tiendas
 */

// Ruta pública para obtener todas las tiendas
router.get('/', storeController.getAllStores);

// Ruta pública para obtener una tienda por ID
router.get('/:storeId', storeController.getStoreById);

// Rutas protegidas - requieren autenticación
router.use(authenticate);

// Obtener tiendas asignadas a un usuario (cualquier usuario autenticado puede ver sus tiendas)
router.get('/user/:userId', storeController.getStoresByUserId);

// TODO: IMPLEMENTAR REALMENTE - Middleware para verificar roles de administrador
// Por ahora, permitimos el acceso para que la aplicación funcione
const tempAuthorizeAdmin = (req, res, next) => {
  return next();
};

// Rutas para administradores - requieren rol de admin
router.use(tempAuthorizeAdmin);

// Crear una nueva tienda
router.post('/', storeController.createStore);

// Actualizar una tienda
router.put('/:storeId', storeController.updateStore);

// Eliminar una tienda
router.delete('/:storeId', storeController.deleteStore);

// Asignar un usuario a una tienda
router.post('/:storeId/assign', storeController.assignUserToStore);

// Desasignar un usuario de una tienda
router.post('/:storeId/unassign', storeController.unassignUserFromStore);

module.exports = router;
