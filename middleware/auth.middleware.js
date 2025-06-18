const jwt = require('jsonwebtoken');
require('dotenv').config();
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware de autenticación básico que verifica el token JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header missing'
    });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token missing'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Error al verificar token JWT', { error: error.message });
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
};

/**
 * Middleware para verificar roles de usuario
 * @param {Array} roles - Array de roles permitidos
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    // Se requiere que el middleware de autenticación se haya ejecutado antes
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const userRole = req.user.role;
    
    if (roles.includes(userRole)) {
      return next();
    }
    
    logger.warn('Intento de acceso no autorizado', {
      userId: req.user.userId,
      requiredRoles: roles,
      userRole: userRole
    });
    
    return res.status(403).json({
      success: false,
      message: 'No tienes permiso para acceder a este recurso'
    });
  };
};

/**
 * Middleware para verificar permisos específicos
 * @param {Array} permissions - Array de permisos requeridos
 */
const hasPermissions = (permissions) => {
  return (req, res, next) => {
    // TODO: IMPLEMENTAR REALMENTE - Sistema completo de verificación de permisos
    // Esta implementación asume que los permisos están en req.user.permissions
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    // Si el usuario es admin u owner, permitir todo
    if (req.user.role === 'admin' || req.user.role === 'owner') {
      return next();
    }
    
    const userPermissions = req.user.permissions || [];
    
    // Verificar si el usuario tiene al menos uno de los permisos requeridos
    const hasRequiredPermission = permissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (hasRequiredPermission) {
      return next();
    }
    
    logger.warn('Permisos insuficientes', {
      userId: req.user.userId,
      requiredPermissions: permissions,
      userPermissions: userPermissions
    });
    
    return res.status(403).json({
      success: false,
      message: 'No tienes los permisos necesarios para esta acción'
    });
  };
};

/**
 * Middleware para verificar si el usuario es administrador
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }
  
  if (req.user.role === 'admin' || req.user.role === 'owner') {
    return next();
  }
  
  logger.warn('Intento de acceso a función administrativa', {
    userId: req.user.userId,
    userRole: req.user.role
  });
  
  return res.status(403).json({
    success: false,
    message: 'Se requieren privilegios de administrador'
  });
};

module.exports = {
  authenticate: authMiddleware,
  checkRole,
  hasPermissions,
  isAdmin
};
