const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Esquema para el ítem de un pedido
 */
const orderItemSchema = new Schema({
  productId: {
    type: String,
    required: [true, 'El ID del producto es obligatorio']
  },
  productName: {
    type: String,
    required: [true, 'El nombre del producto es obligatorio'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'El precio del producto es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  quantity: {
    type: Number,
    required: [true, 'La cantidad es obligatoria'],
    min: [1, 'La cantidad debe ser al menos 1']
  },
  size: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    default: null
  },
  customizations: {
    type: [String],
    default: []
  }
});

/**
 * Esquema para un pedido completo
 */
const orderSchema = new Schema({
  userId: {
    type: String,
    required: [true, 'El ID del usuario es obligatorio']
  },
  userName: {
    type: String,
    required: [true, 'El nombre del usuario es obligatorio'],
    trim: true
  },
  storeId: {
    type: String,
    required: [true, 'El ID de la tienda es obligatorio']
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Se requiere al menos un ítem en el pedido'],
    validate: {
      validator: function(items) {
        return items.length > 0;
      },
      message: 'El pedido debe contener al menos un producto'
    }
  },
  total: {
    type: Number,
    required: [true, 'El total del pedido es obligatorio'],
    min: [0, 'El total no puede ser negativo']
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'],
    default: 'pending'
  },
  pickupTime: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    trim: true
  },
  // Campos para el manejo de pagos y descuentos
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'mobile_payment', 'loyalty_points'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  discounts: {
    type: [{
      code: String,
      amount: Number,
      type: {
        type: String,
        enum: ['percentage', 'fixed']
      }
    }],
    default: []
  },
  // Rating y feedback del cliente
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    comment: {
      type: String,
      trim: true,
      default: null
    },
    createdAt: {
      type: Date,
      default: null
    }
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

module.exports = mongoose.model('Order', orderSchema);
