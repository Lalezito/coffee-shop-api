const FlavorProfile = require('../models/flavor_profile.model');
const logger = require('../utils/logger');

class FlavorProfileController {
  /**
   * Obtener el perfil de sabor de un usuario
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getUserFlavorProfile(req, res) {
    try {
      const { userId } = req.params;

      // Verificar que el usuario solicitando los datos tenga permisos
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este perfil de sabor',
        });
      }

      // Buscar el perfil de sabor del usuario
      const flavorProfile = await FlavorProfile.findOne({ userId });

      // Si no existe, crear uno con valores predeterminados
      if (!flavorProfile) {
        const newProfile = new FlavorProfile({ userId });
        await newProfile.save();
        
        return res.status(200).json({
          success: true,
          message: 'Perfil de sabor creado con valores predeterminados',
          data: newProfile,
        });
      }

      return res.status(200).json({
        success: true,
        data: flavorProfile,
      });
    } catch (error) {
      logger.error(`Error al obtener perfil de sabor: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Actualizar el perfil de sabor de un usuario
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async updateFlavorProfile(req, res) {
    try {
      const { userId } = req.params;
      const profileData = req.body;

      // Verificar que el usuario actualizando los datos tenga permisos
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar este perfil de sabor',
        });
      }

      // Validar datos del perfil
      const validationErrors = this._validateProfileData(profileData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Datos de perfil inválidos',
          errors: validationErrors,
        });
      }

      // Buscar y actualizar el perfil, o crear uno nuevo si no existe
      const options = { new: true, upsert: true, setDefaultsOnInsert: true };
      const updatedProfile = await FlavorProfile.findOneAndUpdate(
        { userId },
        profileData,
        options
      );

      return res.status(200).json({
        success: true,
        message: 'Perfil de sabor actualizado correctamente',
        data: updatedProfile,
      });
    } catch (error) {
      logger.error(`Error al actualizar perfil de sabor: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Obtener recomendaciones de productos basadas en el perfil de sabor
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getRecommendations(req, res) {
    try {
      const { userId } = req.params;

      // Buscar el perfil de sabor del usuario
      const flavorProfile = await FlavorProfile.findOne({ userId });

      if (!flavorProfile) {
        return res.status(404).json({
          success: false,
          message: 'Perfil de sabor no encontrado',
        });
      }

      // Obtener recomendaciones usando el método del modelo
      const recommendations = await flavorProfile.getRecommendedProducts();

      return res.status(200).json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      logger.error(`Error al obtener recomendaciones: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Calcular compatibilidad de un producto con el perfil de sabor
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async calculateProductCompatibility(req, res) {
    try {
      const { userId, productId } = req.params;

      // Buscar el perfil de sabor del usuario
      const flavorProfile = await FlavorProfile.findOne({ userId });
      if (!flavorProfile) {
        return res.status(404).json({
          success: false,
          message: 'Perfil de sabor no encontrado',
        });
      }

      // Obtener el producto
      const Product = require('../models/product.model');
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado',
        });
      }

      // Calcular compatibilidad
      const compatibilityScore = flavorProfile.calculateCompatibility(product);

      return res.status(200).json({
        success: true,
        data: {
          productId,
          compatibilityScore,
          compatibilityLevel: this._getCompatibilityLevel(compatibilityScore),
        },
      });
    } catch (error) {
      logger.error(`Error al calcular compatibilidad: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Validar los datos del perfil de sabor
   * @param {Object} data - Datos del perfil a validar
   * @returns {Array} - Lista de errores de validación
   * @private
   */
  _validateProfileData(data) {
    const errors = [];

    // Validar preferencias numéricas
    if (data.preferences) {
      const preferenceFields = ['intensity', 'acidity', 'bitterness', 'sweetness', 'body'];
      
      for (const field of preferenceFields) {
        if (data.preferences[field] !== undefined) {
          const value = data.preferences[field];
          if (typeof value !== 'number' || value < 1 || value > 5) {
            errors.push(`${field} debe ser un número entre 1 y 5`);
          }
        }
      }
    }

    // Validar tostados preferidos
    if (data.preferredRoasts) {
      const validRoasts = ['light', 'medium', 'medium-dark', 'dark', 'espresso'];
      
      if (!Array.isArray(data.preferredRoasts)) {
        errors.push('preferredRoasts debe ser un array');
      } else {
        for (const roast of data.preferredRoasts) {
          if (!validRoasts.includes(roast)) {
            errors.push(`${roast} no es un tipo de tostado válido`);
          }
        }
      }
    }

    // Validar métodos de preparación
    if (data.brewMethods) {
      const validMethods = ['espresso', 'french-press', 'pour-over', 'aeropress', 'moka-pot', 'cold-brew'];
      
      if (!Array.isArray(data.brewMethods)) {
        errors.push('brewMethods debe ser un array');
      } else {
        for (const method of data.brewMethods) {
          if (!validMethods.includes(method)) {
            errors.push(`${method} no es un método de preparación válido`);
          }
        }
      }
    }

    // Validar preferencia de leche
    if (data.milkPreference) {
      const validMilkTypes = ['no-milk', 'dairy', 'oat', 'almond', 'soy', 'coconut', 'any'];
      
      if (!validMilkTypes.includes(data.milkPreference)) {
        errors.push(`${data.milkPreference} no es una preferencia de leche válida`);
      }
    }

    // Validar preferencia de endulzante
    if (data.sweetenerPreference) {
      const validSweeteners = ['no-sweetener', 'sugar', 'honey', 'stevia', 'artificial', 'any'];
      
      if (!validSweeteners.includes(data.sweetenerPreference)) {
        errors.push(`${data.sweetenerPreference} no es una preferencia de endulzante válida`);
      }
    }

    return errors;
  }

  /**
   * Obtener nivel de compatibilidad basado en puntuación
   * @param {Number} score - Puntuación de compatibilidad
   * @returns {String} - Nivel de compatibilidad
   * @private
   */
  _getCompatibilityLevel(score) {
    if (score >= 90) return 'Perfecto';
    if (score >= 80) return 'Excelente';
    if (score >= 70) return 'Muy bueno';
    if (score >= 60) return 'Bueno';
    if (score >= 50) return 'Moderado';
    if (score >= 40) return 'Regular';
    if (score >= 30) return 'Bajo';
    return 'No recomendado';
  }
}

module.exports = new FlavorProfileController();
