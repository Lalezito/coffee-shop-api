const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Esquema para los ítems en el carrito
 */
const cartItemSchema = new Schema({
  productId: {
    type: String,
    required: [true, 'El ID del producto es obligatorio']
  },
  productName: {
    type: String,
    required: [true, 'El nombre del producto es obligatorio'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'La cantidad es obligatoria'],
    min: [1, 'La cantidad mínima es 1']
  },
  price: {
    type: Number,
    required: [true, 'El precio unitario es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  image: {
    type: String,
    default: null
  },
  customizations: {
    type: [String],
    default: []
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Método para calcular el total del ítem
 */
cartItemSchema.virtual('total').get(function() {
  return this.price * this.quantity;
});

/**
 * Esquema principal del carrito
 */
const cartSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  items: {
    type: [cartItemSchema],
    default: []
  },
  discountCode: {
    type: String,
    default: null
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  subtotal: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Expirar el carrito después de 30 días de inactividad
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  savedForLater: {
    type: [cartItemSchema],
    default: []
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Middleware para actualizar los totales antes de guardar
 */
cartSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.total = this.subtotal - this.discountAmount;
    
    // Asegurar que el total no sea negativo
    if (this.total < 0) {
      this.total = 0;
    }
  } else {
    this.subtotal = 0;
    this.total = 0;
    this.discountAmount = 0;
    this.discountCode = null;
  }
  
  // Actualizar la fecha de expiración
  const date = new Date();
  date.setDate(date.getDate() + 30);
  this.expiresAt = date;
  
  this.updatedAt = Date.now();
  next();
});

/**
 * Índice para expiración automática usando TTL
 */
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Cart', cartSchema);