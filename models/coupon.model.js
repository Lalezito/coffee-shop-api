const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Esquema para el modelo de cupón o descuento
 */
const couponSchema = new Schema({
  code: {
    type: String,
    required: [true, 'El código del cupón es obligatorio'],
    unique: true,
    trim: true,
    uppercase: true
  },
  title: {
    type: String,
    required: [true, 'El título del cupón es obligatorio'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La descripción del cupón es obligatoria'],
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixedAmount', 'freeItem', 'shipping'],
    required: [true, 'El tipo de cupón es obligatorio'],
    default: 'percentage'
  },
  value: {
    type: Number,
    required: [true, 'El valor del cupón es obligatorio'],
    min: [0, 'El valor no puede ser negativo']
  },
  minimumPurchase: {
    type: Number,
    min: [0, 'El monto mínimo de compra no puede ser negativo'],
    default: 0
  },
  expirationDate: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días por defecto
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isOnetime: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String,
    default: null
  },
  maxRedemptions: {
    type: Number,
    default: null
  },
  currentRedemptions: {
    type: Number,
    default: 0
  },
  applicableProductIds: {
    type: [String],
    default: []
  },
  excludedProductIds: {
    type: [String],
    default: []
  },
  // Campos para cupones personalizados basados en comportamiento
  userBehaviorRules: {
    type: [{
      metric: {
        type: String,
        enum: ['orderFrequency', 'totalSpent', 'productPurchased', 'daysSinceLastOrder', 'visitFrequency']
      },
      condition: {
        type: String,
        enum: ['greaterThan', 'lessThan', 'equals', 'contains', 'startsWith', 'endsWith']
      },
      value: mongoose.Schema.Types.Mixed
    }],
    default: []
  },
  // Campos para descuentos dinámicos por hora
  timeRestrictions: {
    type: {
      daysOfWeek: {
        type: [Number], // 0-6 (domingo a sábado)
        default: []
      },
      startHour: {
        type: Number,
        min: 0,
        max: 23
      },
      endHour: {
        type: Number,
        min: 0,
        max: 23
      },
      storeOccupancyLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'any'],
        default: 'any'
      }
    },
    default: null
  },
  // Campos para sistema de cashback
  cashbackDetails: {
    type: {
      percentage: {
        type: Number,
        min: 0,
        max: 100
      },
      expirationDays: {
        type: Number,
        default: 30
      },
      minAmount: {
        type: Number,
        default: 0
      }
    },
    default: null
  },
  // Campos para sistema de referidos
  referralDetails: {
    type: {
      referrerReward: {
        type: Number,
        min: 0
      },
      referredReward: {
        type: Number,
        min: 0
      },
      validForNewUsersOnly: {
        type: Boolean,
        default: true
      },
      maxReferrals: {
        type: Number,
        default: null
      }
    },
    default: null
  },
  // Campo para sistema de ofertas por fechas especiales
  specialDatesDetails: {
    type: [{
      name: String,
      startDate: Date,
      endDate: Date,
      userDemographics: {
        ageRange: {
          min: Number,
          max: Number
        },
        interests: [String],
        region: String
      }
    }],
    default: []
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

// Método para verificar si un cupón ha expirado
couponSchema.methods.isExpired = function() {
  if (!this.expirationDate) return false;
  return new Date() > this.expirationDate;
};

// Método para verificar si un cupón ha alcanzado su límite de uso
couponSchema.methods.isMaxedOut = function() {
  if (!this.maxRedemptions) return false;
  return this.currentRedemptions >= this.maxRedemptions;
};

// Método para verificar si un cupón es válido para usar
couponSchema.methods.isValid = function() {
  return this.isActive && !this.isExpired() && !this.isMaxedOut();
};

// Método para verificar si un cupón es aplicable al monto de compra
couponSchema.methods.isApplicableToAmount = function(amount) {
  if (!this.minimumPurchase) return true;
  return amount >= this.minimumPurchase;
};

// Método para calcular el descuento basado en el valor total
couponSchema.methods.calculateDiscount = function(totalAmount, productIds = []) {
  if (!this.isValid()) return 0;
  if (!this.isApplicableToAmount(totalAmount)) return 0;

  // Verificar si hay restricciones de producto
  if (this.applicableProductIds && this.applicableProductIds.length > 0) {
    const hasApplicableProduct = productIds.some(id => 
      this.applicableProductIds.includes(id)
    );
    if (!hasApplicableProduct) return 0;
  }

  // Verificar si hay productos excluidos
  if (this.excludedProductIds && this.excludedProductIds.length > 0) {
    const hasExcludedProduct = productIds.some(id => 
      this.excludedProductIds.includes(id)
    );
    if (hasExcludedProduct) return 0;
  }

  // Cupón para envío gratis - esto debe manejarse separadamente
  if (this.type === 'shipping') return 0;

  // Cupón para producto gratis - esto debe manejarse separadamente
  if (this.type === 'freeItem') return 0;

  // Descuento porcentual
  if (this.type === 'percentage') {
    return totalAmount * (this.value / 100);
  }

  // Descuento de monto fijo
  if (this.type === 'fixedAmount') {
    // Si el descuento es mayor al total, limitar al total
    return this.value > totalAmount ? totalAmount : this.value;
  }

  return 0;
};

// Índices para mejorar la búsqueda
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1 });
couponSchema.index({ expirationDate: 1 });
couponSchema.index({ 'timeRestrictions.daysOfWeek': 1 });

module.exports = mongoose.model('Coupon', couponSchema);
