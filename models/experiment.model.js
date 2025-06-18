const mongoose = require('mongoose');

/**
 * Modelo para variantes de experimentos A/B
 */
const variantSchema = new mongoose.Schema({
  // Identificador de la variante (ej: 'A', 'B', 'control')
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Título de la notificación para esta variante
  title: {
    type: String,
    required: true
  },
  
  // Contenido de la notificación para esta variante
  content: {
    type: String,
    required: true
  },
  
  // Peso para la distribución (0-100, debe sumar 100 entre todas las variantes)
  weight: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
    default: 50
  },
  
  // Datos adicionales específicos para esta variante
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Métricas de rendimiento
  metrics: {
    // Número de envíos
    impressions: {
      type: Number,
      default: 0
    },
    
    // Número de aperturas
    opens: {
      type: Number,
      default: 0
    },
    
    // Número de clics
    clicks: {
      type: Number,
      default: 0
    },
    
    // Tasa de conversión (ej: compras, registros)
    conversions: {
      type: Number,
      default: 0
    }
  }
});

/**
 * Modelo de Experimento A/B para notificaciones
 */
const experimentSchema = new mongoose.Schema({
  // Nombre del experimento
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Descripción del experimento
  description: {
    type: String,
    required: true
  },
  
  // Segmento al que se dirige el experimento
  segment: {
    type: String,
    required: true
  },
  
  // Variantes del experimento
  variants: {
    type: [variantSchema],
    required: true,
    validate: {
      validator: function(variants) {
        // Debe haber al menos 2 variantes
        if (!variants || variants.length < 2) {
          return false;
        }
        
        // Validar que los pesos sumen 100
        const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
        return totalWeight === 100;
      },
      message: 'Se requieren al menos 2 variantes y los pesos deben sumar 100'
    }
  },
  
  // Fecha de inicio del experimento
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Fecha de finalización del experimento (opcional)
  endDate: {
    type: Date
  },
  
  // Estado del experimento
  status: {
    type: String,
    required: true,
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Duración planificada en días
  durationDays: {
    type: Number,
    min: 1,
    default: 7
  },
  
  // Métrica principal para determinar el ganador
  primaryMetric: {
    type: String,
    required: true,
    enum: ['opens', 'clicks', 'conversions'],
    default: 'clicks'
  },
  
  // Confianza estadística requerida para determinar ganador (%)
  confidenceThreshold: {
    type: Number,
    min: 80,
    max: 99,
    default: 95
  },
  
  // Variante ganadora (después de completar el experimento)
  winner: {
    type: String
  },
  
  // Metadatos adicionales
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
experimentSchema.index({ name: 1 });
experimentSchema.index({ segment: 1 });
experimentSchema.index({ status: 1 });
experimentSchema.index({ startDate: -1 });

const Experiment = mongoose.model('Experiment', experimentSchema);

module.exports = Experiment;
