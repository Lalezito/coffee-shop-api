/**
 * Módulo de logging para la aplicación
 * 
 * TODO: IMPLEMENTAR REALMENTE - Reemplazar con un sistema de logs más robusto
 * como winston o pino para entornos de producción
 */

const logger = {
  info: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`INFO: ${message}`, meta);
    }
  },
  
  warn: (message, meta = {}) => {
    console.warn(`WARNING: ${message}`, meta);
  },
  
  error: (message, meta = {}) => {
    console.error(`ERROR: ${message}`, meta);
    
    // En un entorno de producción, aquí se podría enviar el error a Sentry u otro servicio
    if (process.env.NODE_ENV === 'production' && typeof Sentry !== 'undefined') {
      try {
        Sentry.captureException(new Error(message), {
          extra: meta
        });
      } catch (e) {
        console.error('Error al enviar excepción a Sentry', e);
      }
    }
  },
  
  debug: (message, meta = {}) => {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(`DEBUG: ${message}`, meta);
    }
  }
};

module.exports = logger;
