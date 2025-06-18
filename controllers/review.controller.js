const Review = require('../models/review.model');
const Sentry = require('@sentry/node');

/**
 * Obtener todas las reseñas (con paginación)
 */
exports.getAllReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Review.countDocuments();
    
    return res.status(200).json({
      success: true,
      reviews,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener reseñas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reseñas',
      error: error.message
    });
  }
};

/**
 * Obtener reseñas por ID de producto
 */
exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const reviews = await Review.find({ productId })
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener reseñas por producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reseñas por producto',
      error: error.message
    });
  }
};

/**
 * Obtener reseñas por ID de usuario
 */
exports.getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario solicitante es el mismo o es admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para ver estas reseñas'
      });
    }
    
    const reviews = await Review.find({ userId })
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener reseñas por usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reseñas por usuario',
      error: error.message
    });
  }
};

/**
 * Obtener reseñas por ID de pedido
 */
exports.getReviewsByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // TODO: Verificar que el usuario tiene acceso a este pedido
    
    const reviews = await Review.find({ orderId })
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener reseñas por pedido:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener reseñas por pedido',
      error: error.message
    });
  }
};

/**
 * Crear una nueva reseña
 */
exports.createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment, userName, userAvatar } = req.body;
    const userId = req.user.id;
    
    // Verificar si el usuario ya ha dejado una reseña para este producto en este pedido
    const existingReview = await Review.findOne({ 
      userId, 
      productId,
      orderId 
    });
    
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Ya has dejado una reseña para este producto en este pedido'
      });
    }
    
    // TODO: Verificar que el usuario realmente compró este producto en este pedido
    
    // Crear la nueva reseña
    const review = new Review({
      productId,
      userId,
      orderId,
      userName: userName || req.user.name,
      rating,
      comment,
      userAvatar: userAvatar || req.user.avatar
    });
    
    await review.save();
    
    return res.status(201).json({
      success: true,
      message: 'Reseña creada correctamente',
      review
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al crear reseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear reseña',
      error: error.message
    });
  }
};

/**
 * Actualizar una reseña existente
 */
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    // Buscar la reseña
    const review = await Review.findById(id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Reseña no encontrada'
      });
    }
    
    // Verificar que el usuario es el propietario de la reseña
    if (review.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para modificar esta reseña'
      });
    }
    
    // Actualizar los campos
    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    review.updatedAt = Date.now();
    
    await review.save();
    
    return res.status(200).json({
      success: true,
      message: 'Reseña actualizada correctamente',
      review
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al actualizar reseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar reseña',
      error: error.message
    });
  }
};

/**
 * Eliminar una reseña
 */
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar la reseña
    const review = await Review.findById(id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Reseña no encontrada'
      });
    }
    
    // Verificar que el usuario es el propietario de la reseña o un administrador
    if (review.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para eliminar esta reseña'
      });
    }
    
    // Eliminar la reseña
    await review.deleteOne();
    
    return res.status(200).json({
      success: true,
      message: 'Reseña eliminada correctamente'
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al eliminar reseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar reseña',
      error: error.message
    });
  }
};

/**
 * Obtener promedio de calificaciones por producto
 */
exports.getProductRating = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const result = await Review.aggregate([
      { $match: { productId } },
      { $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);
    
    if (result.length === 0) {
      return res.status(200).json({
        success: true,
        averageRating: 0,
        reviewCount: 0
      });
    }
    
    return res.status(200).json({
      success: true,
      averageRating: result[0].averageRating,
      reviewCount: result[0].reviewCount
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al obtener calificación de producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener calificación de producto',
      error: error.message
    });
  }
};
