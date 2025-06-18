const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false // Puede ser null si el pago se procesa antes de crear la orden
  },
  stripePaymentIntentId: {
    type: String,
    required: true
  },
  stripeCustomerId: {
    type: String,
    required: false
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'mxn'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'apple_pay', 'google_pay', 'cash', 'paypal'],
    required: true
  },
  paymentMethodId: {
    type: String,
    required: false
  },
  last4: {
    type: String,
    required: false
  },
  cardBrand: {
    type: String,
    required: false
  },
  receiptUrl: {
    type: String,
    required: false
  },
  metadata: {
    type: Object,
    default: {}
  },
  errorMessage: {
    type: String,
    required: false
  }
}, { 
  timestamps: true 
});

// Índices para consultas frecuentes
paymentSchema.index({ userId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 }, { unique: true });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
