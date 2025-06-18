/**
 * Modelo para datos del panel de administración
 */
const mongoose = require('mongoose');

// Esquema para estadísticas diarias
const DailyStatSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  sales: {
    total: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  orders: {
    total: {
      type: Number,
      default: 0
    },
    completed: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    cancelled: {
      type: Number,
      default: 0
    }
  },
  customers: {
    new: {
      type: Number,
      default: 0
    },
    active: {
      type: Number,
      default: 0
    }
  },
  products: {
    viewed: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      count: {
        type: Number,
        default: 0
      }
    }],
    purchased: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      count: {
        type: Number,
        default: 0
      },
      revenue: {
        type: Number,
        default: 0
      }
    }]
  }
}, { timestamps: true });

// Método para agregar una venta al día actual
DailyStatSchema.statics.addSale = async function(amount) {
  // TODO: IMPLEMENTAR REALMENTE - Actualizar estadísticas al procesar una venta
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await this.findOneAndUpdate(
    { date: today },
    { 
      $inc: { 
        'sales.total': amount,
        'sales.count': 1
      } 
    },
    { new: true, upsert: true }
  );
  
  return result;
};

// Método para actualizar estadísticas de una orden
DailyStatSchema.statics.updateOrderStats = async function(status) {
  // TODO: IMPLEMENTAR REALMENTE - Actualizar estadísticas al cambiar estado de una orden
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const updateQuery = {};
  updateQuery[`orders.${status}`] = 1;
  updateQuery['orders.total'] = 1;

  const result = await this.findOneAndUpdate(
    { date: today },
    { $inc: updateQuery },
    { new: true, upsert: true }
  );
  
  return result;
};

// Método para registrar un nuevo cliente
DailyStatSchema.statics.addNewCustomer = async function() {
  // TODO: IMPLEMENTAR REALMENTE - Actualizar estadísticas al registrar un cliente nuevo
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await this.findOneAndUpdate(
    { date: today },
    { $inc: { 'customers.new': 1 } },
    { new: true, upsert: true }
  );
  
  return result;
};

// Método para actualizar estadísticas de productos
DailyStatSchema.statics.addProductView = async function(productId) {
  // TODO: IMPLEMENTAR REALMENTE - Actualizar estadísticas al ver un producto
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await this.findOneAndUpdate(
    { 
      date: today,
      'products.viewed.productId': productId 
    },
    { 
      $inc: { 'products.viewed.$.count': 1 } 
    },
    { new: true }
  );

  if (!result) {
    // Si el producto no está en la lista, agregarlo
    return await this.findOneAndUpdate(
      { date: today },
      { 
        $push: { 
          'products.viewed': { 
            productId, 
            count: 1 
          } 
        } 
      },
      { new: true, upsert: true }
    );
  }
  
  return result;
};

const DailyStat = mongoose.model('DailyStat', DailyStatSchema);

module.exports = DailyStat;