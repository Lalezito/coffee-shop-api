const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Esquema para el modelo de promociones de la tienda
 */
const promotionSchema = new Schema({
  title: {
    type: String,
    required: [true, 'El título de la promoción es obligatorio'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La descripción de la promoción es obligatoria'],
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixedAmount'],
    required: [true, 'El tipo de descuento es obligatorio'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: [true, 'El valor del descuento es obligatorio'],
    min: [0, 'El valor no puede ser negativo']
  },
  validFrom: {
    type: Date,
    required: [true, 'La fecha de inicio de validez es obligatoria'],
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'La fecha de fin de validez es obligatoria']
  },
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  maxUsesPerUser: {
    type: Number,
    default: null
  },
  totalUses: {
    type: Number,
    default: 0
  },
  maxTotalUses: {
    type: Number,
    default: null
  },
  applicableProductIds: {
    type: [Schema.Types.ObjectId],
    ref: 'Product',
    default: []
  },
  applicableCategoryIds: {
    type: [Schema.Types.ObjectId],
    ref: 'Category',
    default: []
  },
  minimumPurchase: {
    type: Number,
    min: [0, 'El monto mínimo de compra no puede ser negativo'],
    default: 0
  },
  imageUrl: {
    type: String,
    default: null
  },
  // Campo para reglas adicionales de aplicación
  rules: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true, // Añade createdAt y updatedAt
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Método para verificar si una promoción ha expirado
promotionSchema.methods.isExpired = function() {
  return new Date() > this.validUntil;
};

// Método para verificar si una promoción está actualmente válida (dentro del rango de fechas)
promotionSchema.methods.isCurrentlyValid = function() {
  const now = new Date();
  return this.validFrom <= now && now <= this.validUntil;
};

// Método para verificar si una promoción es válida para usar
promotionSchema.methods.isValid = function() {
  return this.isActive && this.isCurrentlyValid() && !this.hasReachedMaxUses();
};

// Método para verificar si la promoción ha alcanzado su máximo de usos
promotionSchema.methods.hasReachedMaxUses = function() {
  if (!this.maxTotalUses) return false;
  return this.totalUses >= this.maxTotalUses;
};

// Método para calcular el descuento basado en el valor total
promotionSchema.methods.calculateDiscount = function(totalAmount, productIds = []) {
  if (!this.isValid()) return 0;
  
  // Verificar monto mínimo de compra
  if (totalAmount < this.minimumPurchase) return 0;

  // Verificar si hay restricciones de producto si hay productIds
  if (this.applicableProductIds.length > 0 && productIds.length > 0) {
    const hasApplicableProduct = productIds.some(id => 
      this.applicableProductIds.includes(id.toString())
    );
    if (!hasApplicableProduct) return 0;
  }

  // Descuento porcentual
  if (this.discountType === 'percentage') {
    return totalAmount * (this.discountValue / 100);
  }

  // Descuento de monto fijo
  if (this.discountType === 'fixedAmount') {
    // Si el descuento es mayor al total, limitar al total
    return this.discountValue > totalAmount ? totalAmount : this.discountValue;
  }

  return 0;
};

// Índices para mejorar la búsqueda
promotionSchema.index({ isActive: 1 });
promotionSchema.index({ validFrom: 1, validUntil: 1 });
promotionSchema.index({ code: 1 });
promotionSchema.index({ isHighlighted: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
