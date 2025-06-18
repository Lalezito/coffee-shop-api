const Promotion = require('../models/promotion.model');
const { handleError } = require('../utils/error.utils');
const logger = require('../utils/logger');

/**
 * Controlador para la gestión de promociones
 */
exports.getAllPromotions = async (req, res) => {
  try {
    const { 
      active, 
      highlighted, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Construir filtro de búsqueda
    const filter = {};
    
    if (active === 'true') {
      filter.isActive = true;
    } else if (active === 'false') {
      filter.isActive = false;
    }
    
    if (highlighted === 'true') {
      filter.isHighlighted = true;
    } else if (highlighted === 'false') {
      filter.isHighlighted = false;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Configuración de paginación
    const skip = (page - 1) * limit;
    
    // Configuración de orden
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Ejecutar consulta
    const [promotions, total] = await Promise.all([
      Promotion.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Promotion.countDocuments(filter)
    ]);
    
    // Verificar cuáles promociones están expiradas
    const now = new Date();
    const processedPromotions = promotions.map(promotion => {
      const doc = promotion.toObject();
      doc.isExpired = now > promotion.validUntil;
      return doc;
    });

    return res.status(200).json({
      success: true,
      count: processedPromotions.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: processedPromotions
    });
  } catch (error) {
    logger.error('Error al obtener las promociones:', error);
    return handleError(res, error, 'Error al obtener las promociones');
  }
};

/**
 * Obtener una promoción específica por ID
 */
exports.getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findById(id);
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoción no encontrada'
      });
    }
    
    const now = new Date();
    const result = promotion.toObject();
    result.isExpired = now > promotion.validUntil;
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error al obtener la promoción con ID ${req.params.id}:`, error);
    return handleError(res, error, 'Error al obtener la promoción');
  }
};

/**
 * Crear una nueva promoción
 */
exports.createPromotion = async (req, res) => {
  try {
    const promotionData = req.body;
    
    // Validación personalizada si es necesario
    if (promotionData.validFrom && promotionData.validUntil) {
      if (new Date(promotionData.validFrom) > new Date(promotionData.validUntil)) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de inicio debe ser anterior a la fecha de finalización'
        });
      }
    }
    
    // Si hay código, verificar que sea único
    if (promotionData.code) {
      const existingPromotion = await Promotion.findOne({ 
        code: promotionData.code.trim().toUpperCase() 
      });
      
      if (existingPromotion) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una promoción con este código'
        });
      }
    }
    
    const newPromotion = new Promotion(promotionData);
    await newPromotion.save();
    
    logger.info(`Nueva promoción creada: ${newPromotion.title}`);
    
    return res.status(201).json({
      success: true,
      data: newPromotion
    });
  } catch (error) {
    logger.error('Error al crear la promoción:', error);
    return handleError(res, error, 'Error al crear la promoción');
  }
};

/**
 * Actualizar una promoción existente
 */
exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Verificar que la promoción existe
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoción no encontrada'
      });
    }
    
    // Si hay actualización del código, verificar que sea único
    if (updates.code && updates.code !== promotion.code) {
      const existingPromotion = await Promotion.findOne({
        code: updates.code.trim().toUpperCase(),
        _id: { $ne: id }
      });
      
      if (existingPromotion) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra promoción con este código'
        });
      }
    }
    
    // Validación de fechas
    if (updates.validFrom && updates.validUntil) {
      if (new Date(updates.validFrom) > new Date(updates.validUntil)) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de inicio debe ser anterior a la fecha de finalización'
        });
      }
    } else if (updates.validFrom && !updates.validUntil) {
      if (new Date(updates.validFrom) > promotion.validUntil) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de inicio debe ser anterior a la fecha de finalización'
        });
      }
    } else if (!updates.validFrom && updates.validUntil) {
      if (promotion.validFrom > new Date(updates.validUntil)) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de inicio debe ser anterior a la fecha de finalización'
        });
      }
    }
    
    // Actualizar la promoción
    const updatedPromotion = await Promotion.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    logger.info(`Promoción actualizada: ${updatedPromotion.title}`);
    
    return res.status(200).json({
      success: true,
      data: updatedPromotion
    });
  } catch (error) {
    logger.error(`Error al actualizar la promoción con ID ${req.params.id}:`, error);
    return handleError(res, error, 'Error al actualizar la promoción');
  }
};

/**
 * Cambiar el estado de una promoción (activar/desactivar)
 */
exports.togglePromotionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoción no encontrada'
      });
    }
    
    // Invertir el estado actual
    promotion.isActive = !promotion.isActive;
    await promotion.save();
    
    logger.info(`Estado de promoción ${id} cambiado a: ${promotion.isActive ? 'activo' : 'inactivo'}`);
    
    return res.status(200).json({
      success: true,
      data: promotion,
      message: `La promoción ha sido ${promotion.isActive ? 'activada' : 'desactivada'}`
    });
  } catch (error) {
    logger.error(`Error al cambiar el estado de la promoción con ID ${req.params.id}:`, error);
    return handleError(res, error, 'Error al cambiar el estado de la promoción');
  }
};

/**
 * Eliminar una promoción
 */
exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    
    const promotion = await Promotion.findByIdAndDelete(id);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoción no encontrada'
      });
    }
    
    logger.info(`Promoción eliminada: ${promotion.title}`);
    
    return res.status(200).json({
      success: true,
      message: 'Promoción eliminada correctamente'
    });
  } catch (error) {
    logger.error(`Error al eliminar la promoción con ID ${req.params.id}:`, error);
    return handleError(res, error, 'Error al eliminar la promoción');
  }
};

/**
 * Obtener promociones activas y válidas (para clientes)
 */
exports.getActivePromotions = async (req, res) => {
  try {
    const now = new Date();
    
    const promotions = await Promotion.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    });
    
    return res.status(200).json({
      success: true,
      count: promotions.length,
      data: promotions
    });
  } catch (error) {
    logger.error('Error al obtener las promociones activas:', error);
    return handleError(res, error, 'Error al obtener las promociones activas');
  }
};

/**
 * Obtener promociones destacadas (para mostrar en la app)
 */
exports.getHighlightedPromotions = async (req, res) => {
  try {
    const now = new Date();
    
    const promotions = await Promotion.find({
      isActive: true,
      isHighlighted: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    }).limit(5);
    
    return res.status(200).json({
      success: true,
      count: promotions.length,
      data: promotions
    });
  } catch (error) {
    logger.error('Error al obtener las promociones destacadas:', error);
    return handleError(res, error, 'Error al obtener las promociones destacadas');
  }
};
