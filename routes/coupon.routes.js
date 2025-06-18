const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { authenticate } = require("../middleware/auth.middleware");

// TODO: IMPLEMENTAR REALMENTE - Middleware de verificación de roles
// Función temporal para verificación de roles
const tempCheckRole = (roles) => (req, res, next) => {
  // Simplemente permite el acceso sin verificación para que la app pueda funcionar
  return next();
};

/**
 * Rutas para la gestión de cupones y descuentos
 */

// Rutas públicas
// Validar un cupón por código (accesible sin autenticación)
router.post('/validate/:code', couponController.validateCouponForCart);

// Obtener un cupón por código (accesible sin autenticación)
router.get('/code/:code', couponController.getCouponByCode);

// Rutas protegidas con autenticación
router.use(authenticate);

// Obtener todos los cupones (admin/owner)
router.get(
  '/',
  tempCheckRole(['admin', 'owner']),
  couponController.getCoupons
);

// Crear un nuevo cupón (admin/owner)
router.post(
  '/',
  tempCheckRole(['admin', 'owner']),
  couponController.createCoupon
);

// Obtener un cupón por su ID (admin/owner/employee)
router.get(
  '/:couponId',
  tempCheckRole(['admin', 'owner', 'employee']),
  couponController.getCouponById
);

// Actualizar un cupón (admin/owner)
router.put(
  '/:couponId',
  tempCheckRole(['admin', 'owner']),
  couponController.updateCoupon
);

// Eliminar un cupón (admin/owner)
router.delete(
  '/:couponId',
  tempCheckRole(['admin', 'owner']),
  couponController.deleteCoupon
);

// Sistema de cupones personalizados basado en comportamiento
router.get(
  '/personalized/:userId',
  couponController.getPersonalizedCoupons
);

// Sistema de descuentos dinámicos por hora
router.get(
  '/time-based',
  couponController.getTimeBasedCoupons
);

// Sistema de referidos
router.post(
  '/referral/:referrerId',
  couponController.createReferralCoupon
);

// Sistema de cashback
router.post(
  '/cashback/:userId',
  tempCheckRole(['admin', 'owner']),
  couponController.applyCashback
);

// Sistema de ofertas por fechas especiales
router.post(
  '/special-date',
  tempCheckRole(['admin', 'owner']),
  couponController.generateSpecialDateCoupons
);

module.exports = router;
