const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Esquema para el modelo de tienda
 */
const storeSchema = new Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la tienda es obligatorio'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'La dirección de la tienda es obligatoria'],
    trim: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  assignedUserIds: {
    type: [String],
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

module.exports = mongoose.model('Store', storeSchema);
