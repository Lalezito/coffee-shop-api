/**
 * Utilidades para manejo de errores
 */

/**
 * Crea un error personalizado con código de estado
 * @param {string} message - Mensaje del error
 * @param {number} statusCode - Código de estado HTTP
 * @returns {Error} Error personalizado
 */
const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Maneja errores de validación de Mongoose
 * @param {Error} error - Error de Mongoose
 * @returns {Object} Objeto con mensaje de error formateado
 */
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  return {
    message: 'Error de validación',
    errors: errors,
    statusCode: 400
  };
};

/**
 * Maneja errores de duplicado de MongoDB
 * @param {Error} error - Error de MongoDB
 * @returns {Object} Objeto con mensaje de error formateado
 */
const handleDuplicateError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  return {
    message: `El ${field} ya existe`,
    statusCode: 400
  };
};

/**
 * Maneja errores de cast de MongoDB
 * @param {Error} error - Error de cast
 * @returns {Object} Objeto con mensaje de error formateado
 */
const handleCastError = (error) => {
  return {
    message: `ID inválido: ${error.value}`,
    statusCode: 400
  };
};

/**
 * Formatea errores para respuesta de API
 * @param {Error} error - Error a formatear
 * @returns {Object} Error formateado
 */
const formatError = (error) => {
  let formattedError = {
    message: error.message || 'Error interno del servidor',
    statusCode: error.statusCode || 500
  };

  // Manejar diferentes tipos de errores de MongoDB
  if (error.name === 'ValidationError') {
    formattedError = handleValidationError(error);
  } else if (error.code === 11000) {
    formattedError = handleDuplicateError(error);
  } else if (error.name === 'CastError') {
    formattedError = handleCastError(error);
  }

  return formattedError;
};

/**
 * Middleware para manejo de errores async
 * @param {Function} fn - Función async
 * @returns {Function} Middleware que maneja errores
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  createError,
  handleValidationError,
  handleDuplicateError,
  handleCastError,
  formatError,
  asyncHandler
}; 