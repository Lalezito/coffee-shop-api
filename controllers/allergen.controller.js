const { Allergen, UserAllergen } = require('../models/allergen.model');
const logger = require('../utils/logger');

class AllergenController {
  /**
   * Obtener todos los alérgenos disponibles
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getAllAllergens(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const allergens = await Allergen.find()
        .select('name description slug icon severity commonIn')
        .sort('name')
        .skip(skip)
        .limit(Number(limit));

      const total = await Allergen.countDocuments();

      return res.status(200).json({
        success: true,
        data: allergens,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error(`Error al obtener alérgenos: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Crear un nuevo alérgeno
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async createAllergen(req, res) {
    try {
      // Verificar si el usuario es administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear alérgenos',
        });
      }

      const { name, description, slug, icon, severity, commonIn } = req.body;

      // Verificar si ya existe un alérgeno con el mismo nombre o slug
      const existingAllergen = await Allergen.findOne({
        $or: [{ name }, { slug }],
      });

      if (existingAllergen) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un alérgeno con el mismo nombre o slug',
        });
      }

      // Crear nuevo alérgeno
      const allergen = new Allergen({
        name,
        description,
        slug,
        icon,
        severity,
        commonIn,
      });

      await allergen.save();

      return res.status(201).json({
        success: true,
        message: 'Alérgeno creado correctamente',
        data: allergen,
      });
    } catch (error) {
      logger.error(`Error al crear alérgeno: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Actualizar un alérgeno existente
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async updateAllergen(req, res) {
    try {
      // Verificar si el usuario es administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar alérgenos',
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Verificar si se intenta actualizar el nombre o slug y si ya existe
      if (updateData.name || updateData.slug) {
        const query = {
          _id: { $ne: id },
          $or: [],
        };

        if (updateData.name) {
          query.$or.push({ name: updateData.name });
        }

        if (updateData.slug) {
          query.$or.push({ slug: updateData.slug });
        }

        if (query.$or.length > 0) {
          const existingAllergen = await Allergen.findOne(query);

          if (existingAllergen) {
            return res.status(400).json({
              success: false,
              message: 'Ya existe otro alérgeno con el mismo nombre o slug',
            });
          }
        }
      }

      // Actualizar alérgeno
      const allergen = await Allergen.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!allergen) {
        return res.status(404).json({
          success: false,
          message: 'Alérgeno no encontrado',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Alérgeno actualizado correctamente',
        data: allergen,
      });
    } catch (error) {
      logger.error(`Error al actualizar alérgeno: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Eliminar un alérgeno
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async deleteAllergen(req, res) {
    try {
      // Verificar si el usuario es administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar alérgenos',
        });
      }

      const { id } = req.params;

      // Verificar si hay productos que utilizan este alérgeno
      const Product = require('../models/product.model');
      const productsWithAllergen = await Product.countDocuments({
        'ingredients.allergens': id,
      });

      if (productsWithAllergen > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar el alérgeno porque está en uso en ${productsWithAllergen} productos`,
        });
      }

      // Eliminar alérgeno
      const allergen = await Allergen.findByIdAndDelete(id);

      if (!allergen) {
        return res.status(404).json({
          success: false,
          message: 'Alérgeno no encontrado',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Alérgeno eliminado correctamente',
      });
    } catch (error) {
      logger.error(`Error al eliminar alérgeno: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Obtener la configuración de alérgenos de un usuario
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getUserAllergens(req, res) {
    try {
      const { userId } = req.params;

      // Verificar que el usuario solicitando los datos tenga permisos
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver esta configuración de alérgenos',
        });
      }

      // Buscar la configuración de alérgenos del usuario
      const userAllergens = await UserAllergen.findOne({ userId })
        .populate('allergens.allergenId', 'name description slug icon severity');

      // Si no existe, crear una configuración vacía
      if (!userAllergens) {
        const newUserAllergens = new UserAllergen({ userId });
        await newUserAllergens.save();
        
        return res.status(200).json({
          success: true,
          message: 'Configuración de alérgenos creada',
          data: newUserAllergens,
        });
      }

      return res.status(200).json({
        success: true,
        data: userAllergens,
      });
    } catch (error) {
      logger.error(`Error al obtener configuración de alérgenos: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Actualizar la configuración de alérgenos de un usuario
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async updateUserAllergens(req, res) {
    try {
      const { userId } = req.params;
      const { allergens, additionalNotes, alertPreference } = req.body;

      // Verificar que el usuario actualizando los datos tenga permisos
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar esta configuración de alérgenos',
        });
      }

      // Validar datos de alérgenos
      if (allergens) {
        for (const allergen of allergens) {
          if (!allergen.allergenId) {
            return res.status(400).json({
              success: false,
              message: 'Cada alérgeno debe incluir un allergenId',
            });
          }

          // Verificar que el alérgeno existe
          const allergenExists = await Allergen.exists({ _id: allergen.allergenId });
          if (!allergenExists) {
            return res.status(400).json({
              success: false,
              message: `El alérgeno con ID ${allergen.allergenId} no existe`,
            });
          }
        }
      }

      // Actualizar o crear la configuración de alérgenos
      const updateData = {};
      if (allergens) updateData.allergens = allergens;
      if (additionalNotes !== undefined) updateData.additionalNotes = additionalNotes;
      if (alertPreference) updateData.alertPreference = alertPreference;

      const options = { new: true, upsert: true, setDefaultsOnInsert: true };
      const userAllergens = await UserAllergen.findOneAndUpdate(
        { userId },
        updateData,
        options
      ).populate('allergens.allergenId', 'name description slug icon severity');

      return res.status(200).json({
        success: true,
        message: 'Configuración de alérgenos actualizada correctamente',
        data: userAllergens,
      });
    } catch (error) {
      logger.error(`Error al actualizar configuración de alérgenos: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }

  /**
   * Verificar si un producto es seguro para un usuario específico
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async checkProductSafety(req, res) {
    try {
      const { userId, productId } = req.params;

      // Verificar que el usuario solicitando los datos tenga permisos
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para verificar la seguridad para este usuario',
        });
      }

      // Buscar la configuración de alérgenos del usuario
      const userAllergens = await UserAllergen.findOne({ userId });

      if (!userAllergens) {
        // Si el usuario no tiene configuración de alérgenos, se considera seguro
        return res.status(200).json({
          success: true,
          data: {
            safe: true,
            warnings: [],
            severity: 'none'
          },
        });
      }

      // Verificar la seguridad del producto
      const safety = await userAllergens.isProductSafe(productId);

      return res.status(200).json({
        success: true,
        data: safety,
      });
    } catch (error) {
      logger.error(`Error al verificar seguridad del producto: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      });
    }
  }
}

module.exports = new AllergenController();
