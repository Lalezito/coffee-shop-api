const mongoose = require('mongoose');

// Esquema para productos
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del producto es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción del producto es obligatoria'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'El precio del producto es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  image: {
    type: String,
    required: [true, 'La imagen del producto es obligatoria']
  },
  categoryId: {
    type: String,
    required: [true, 'La categoría del producto es obligatoria']
  },
  stock: {
    type: Number,
    required: [true, 'El stock del producto es obligatorio'],
    min: [0, 'El stock no puede ser negativo'],
    default: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'La calificación mínima es 0'],
    max: [5, 'La calificación máxima es 5']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'El conteo de reseñas no puede ser negativo']
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isOffer: {
    type: Boolean,
    default: false
  },
  isGlutenFree: {
    type: Boolean,
    default: false
  },
  isVegan: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
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

// Índices para búsquedas eficientes
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ categoryId: 1 });
productSchema.index({ isPopular: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ available: 1 });

// Pre-save para actualizar la fecha de modificación
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);
