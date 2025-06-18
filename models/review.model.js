const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Modelo para las reseñas de productos
 */
const reviewSchema = new Schema({
  productId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índice compuesto para consultas de reseñas por usuario y producto
reviewSchema.index({ userId: 1, productId: 1 });
// Índice para consultas de reseñas por orden
reviewSchema.index({ orderId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
