const mongoose = require('mongoose');

/**
 * Modelo de regla para definir criterios de segmentación
 */
const ruleSchema = new mongoose.Schema({
  // Tipo de regla (demographic, behavior, preference, date, etc.)
  type: {
    type: String,
    required: true,
    enum: ['demographic', 'behavior', 'preference', 'purchase', 'engagement', 'location', 'date']
  },
  
  // Campo sobre el que aplicar la regla
  field: {
    type: String,
    required: true
  },
  
  // Operador de comparación
  operator: {
    type: String,
    required: true,
    enum: ['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 
           'lessThan', 'between', 'in', 'notIn', 'exists', 'notExists']
  },
  
  // Valor para comparación (puede ser simple o array)
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      // No se requiere valor para exists/notExists
      return !['exists', 'notExists'].includes(this.operator);
    }
  }
});

/**
 * Modelo de Segmento para agrupar usuarios
 */
const segmentSchema = new mongoose.Schema({
  // Identificador único del segmento
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Descripción del segmento
  description: {
    type: String,
    required: true
  },
  
  // Reglas que definen el segmento (todas deben cumplirse - AND lógico)
  rules: {
    type: [ruleSchema],
    required: true,
    validate: {
      validator: function(rules) {
        return rules && rules.length > 0;
      },
      message: 'El segmento debe tener al menos una regla'
    }
  },
  
  // Etiquetas para organizar segmentos
  tags: [{
    type: String,
    trim: true
  }],
  
  // Indica si el segmento está activo
  active: {
    type: Boolean,
    default: true
  },
  
  // Cantidad estimada de usuarios en el segmento (actualizado periódicamente)
  estimatedSize: {
    type: Number,
    default: 0
  },
  
  // Fecha de última actualización del conteo
  lastSizeUpdate: {
    type: Date
  },
  
  // Metadatos adicionales para el segmento
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
segmentSchema.index({ name: 1 });
segmentSchema.index({ tags: 1 });
segmentSchema.index({ active: 1 });
segmentSchema.index({ createdAt: -1 });

const Segment = mongoose.model('Segment', segmentSchema);

module.exports = Segment;
