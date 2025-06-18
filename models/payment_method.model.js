const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');

/**
 * Esquema para los métodos de pago de los usuarios
 * Implementado de manera segura para almacenar información sensible
 */
const paymentMethodSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  // Identificador único del método de pago en el proveedor (Stripe)
  paymentMethodId: {
    type: String,
    required: true
  },
  // Tipo de método de pago (card, bank_account, etc.)
  type: {
    type: String,
    required: true,
    enum: ['card', 'bank_account', 'apple_pay', 'google_pay'],
    default: 'card'
  },
  // Información del método de pago (enmascarada y segura)
  details: {
    // Para tarjetas
    last4: {
      type: String,
      default: null
    },
    expiryMonth: {
      type: Number,
      default: null
    },
    expiryYear: {
      type: Number,
      default: null
    },
    brand: {
      type: String,
      default: null
    },
    // Para cuentas bancarias
    bankName: {
      type: String,
      default: null
    },
    accountType: {
      type: String,
      enum: ['checking', 'savings', null],
      default: null
    },
    // Campos comunes
    holderName: {
      type: String,
      default: null
    },
    fingerprint: {
      type: String,
      default: null
    }
  },
  // Datos de facturación asociados
  billingDetails: {
    name: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    email: String,
    phone: String
  },
  // Campos para auditoría y control
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

/**
 * Índice compuesto para evitar duplicados de métodos de pago para un usuario
 */
paymentMethodSchema.index({ userId: 1, paymentMethodId: 1 }, { unique: true });

/**
 * Método para obtener representación segura del método de pago
 */
paymentMethodSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  
  // Eliminar campos sensibles
  delete obj._id;
  delete obj.__v;
  
  // Crear representación amigable
  let displayName = '';
  if (this.type === 'card') {
    displayName = `${this.details.brand} **** ${this.details.last4}`;
  } else if (this.type === 'bank_account') {
    displayName = `${this.details.bankName} **** ${this.details.last4}`;
  } else if (this.type === 'apple_pay') {
    displayName = 'Apple Pay';
  } else if (this.type === 'google_pay') {
    displayName = 'Google Pay';
  }
  
  return {
    id: this._id.toString(),
    userId: this.userId,
    type: this.type,
    displayName: displayName,
    last4: this.details.last4,
    brand: this.details.brand,
    expiryMonth: this.details.expiryMonth,
    expiryYear: this.details.expiryYear,
    isDefault: this.isDefault,
    isActive: this.isActive,
    billingDetails: {
      name: this.billingDetails.name,
      city: this.billingDetails.city,
      state: this.billingDetails.state,
      country: this.billingDetails.country
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastUsedAt: this.lastUsedAt
  };
};

/**
 * Middleware para eliminar datos sensibles al convertir a JSON
 */
paymentMethodSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.paymentMethodId;
    if (ret.billingDetails) {
      delete ret.billingDetails.addressLine1;
      delete ret.billingDetails.addressLine2;
      delete ret.billingDetails.postalCode;
      delete ret.billingDetails.email;
      delete ret.billingDetails.phone;
    }
    return ret;
  }
});

/**
 * Método estático para crear un nuevo método de pago desde datos de Stripe
 */
paymentMethodSchema.statics.createFromStripePaymentMethod = async function(userId, stripePaymentMethod) {
  const existingMethod = await this.findOne({
    userId,
    paymentMethodId: stripePaymentMethod.id
  });

  if (existingMethod) {
    return existingMethod;
  }

  let paymentMethodData = {
    userId,
    paymentMethodId: stripePaymentMethod.id,
    type: stripePaymentMethod.type,
    details: {},
    billingDetails: {}
  };

  // Extracción de datos específicos según el tipo de método de pago
  if (stripePaymentMethod.type === 'card') {
    const { card } = stripePaymentMethod;
    paymentMethodData.details = {
      last4: card.last4,
      expiryMonth: card.exp_month,
      expiryYear: card.exp_year,
      brand: card.brand,
      fingerprint: card.fingerprint,
      holderName: card.name
    };
  } else if (stripePaymentMethod.type === 'bank_account') {
    const { bank_account } = stripePaymentMethod;
    paymentMethodData.details = {
      last4: bank_account.last4,
      bankName: bank_account.bank_name,
      accountType: bank_account.account_type,
      fingerprint: bank_account.fingerprint,
      holderName: bank_account.account_holder_name
    };
  }

  // Datos de facturación
  if (stripePaymentMethod.billing_details) {
    const { address, email, name, phone } = stripePaymentMethod.billing_details;
    paymentMethodData.billingDetails = {
      name,
      email,
      phone,
      ...(address && {
        addressLine1: address.line1,
        addressLine2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postal_code,
        country: address.country
      })
    };
  }

  // Crear nuevo registro de método de pago
  return await this.create(paymentMethodData);
};

/**
 * Esquema para transacciones de pago
 */
const paymentTransactionSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  paymentMethodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentMethod',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
  stripeChargeId: {
    type: String,
    default: null
  },
  receiptUrl: {
    type: String,
    default: null
  },
  refundedAmount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  errorMessage: {
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

/**
 * Método para registrar un evento de actualización en la transacción
 */
paymentTransactionSchema.methods.addEvent = function(type, details) {
  if (!this.events) {
    this.events = [];
  }
  
  this.events.push({
    type,
    details,
    timestamp: new Date()
  });
  
  return this.save();
};

/**
 * Método para procesar un reembolso
 */
paymentTransactionSchema.methods.processRefund = async function(amount, reason) {
  // Implementación del reembolso con Stripe se haría aquí
  // Este es un marcador de posición para la implementación real
  
  // Actualizar estado y cantidad reembolsada
  const fullRefund = amount >= this.amount;
  this.status = fullRefund ? 'refunded' : 'partially_refunded';
  this.refundedAmount = Math.min(amount, this.amount);
  
  // Registrar evento de reembolso
  await this.addEvent('refund', {
    amount: this.refundedAmount,
    reason: reason,
    isFullRefund: fullRefund
  });
  
  return this.save();
};

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);
const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = {
  PaymentMethod,
  PaymentTransaction
};
