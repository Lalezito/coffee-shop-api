const mongoose = require('mongoose');

/**
 * Esquema para almacenar información de métodos de pago
 * Guarda referencias a los métodos de pago de Stripe
 */
const paymentMethodSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  paymentMethodId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['card', 'bank_account', 'apple_pay', 'google_pay']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  brand: String,
  last4: String,
  expiryMonth: Number,
  expiryYear: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { timestamps: true });

/**
 * Esquema para transacciones de pago
 */
const paymentTransactionSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentMethodId: {
    type: String,
    required: true
  },
  stripePaymentIntentId: String,
  stripeCustomerId: String,
  receiptUrl: String,
  refundedAmount: {
    type: Number,
    default: 0
  },
  errorMessage: String,
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);
const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = {
  PaymentMethod,
  PaymentTransaction
};
