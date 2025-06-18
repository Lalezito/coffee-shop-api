/**
 * Coffee Shop API - Punto de entrada principal
 * 
 * Este archivo permite ejecutar el servidor en diferentes entornos
 * e inicializar todas las configuraciones necesarias.
 */

// Iniciar servidor usando el script de inicialización
require('./init');

// Este archivo puede ser usado para exportar las APIs para testing y documentación
module.exports = {
  app: require('./server'),
  config: {
    app: require('./config/app.config'),
    api: require('./config/api.config'),
    db: require('./config/db.config')
  },
  models: {
    User: require('./models/user.model'),
    Order: require('./models/order.model'),
    Review: require('./models/review.model')
    // Aquí se pueden exportar otros modelos según se vayan añadiendo
  }
};
