/**
 * Middleware para verificar roles de usuario
 */

// Middleware para verificar si el usuario es administrador (owner o employee)
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  const { role } = req.user;
  
  if (role !== 'owner' && role !== 'employee') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: se requiere rol de administrador'
    });
  }

  next();
};

// Middleware para verificar si el usuario es propietario (owner)
exports.isOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  const { role } = req.user;
  
  if (role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: se requiere rol de propietario'
    });
  }

  next();
};
