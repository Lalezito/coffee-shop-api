const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Esquema para el perfil de sabor de café preferido por los usuarios
 */
const flavorProfileSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  preferences: {
    intensity: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    acidity: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    bitterness: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    sweetness: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    body: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  },
  preferredRoasts: {
    type: [String],
    enum: ['light', 'medium', 'medium-dark', 'dark', 'espresso'],
    default: []
  },
  preferredOrigins: {
    type: [String],
    default: []
  },
  flavorNotes: {
    type: [String],
    default: []
  },
  avoidedFlavorNotes: {
    type: [String],
    default: []
  },
  brewMethods: {
    type: [String],
    enum: ['espresso', 'french-press', 'pour-over', 'aeropress', 'moka-pot', 'cold-brew'],
    default: []
  },
  milkPreference: {
    type: String,
    enum: ['no-milk', 'dairy', 'oat', 'almond', 'soy', 'coconut', 'any'],
    default: 'any'
  },
  sweetenerPreference: {
    type: String,
    enum: ['no-sweetener', 'sugar', 'honey', 'stevia', 'artificial', 'any'],
    default: 'any'
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
  timestamps: true, // Añade createdAt y updatedAt
});

/**
 * Método para obtener perfil de café recomendado basado en preferencias
 */
flavorProfileSchema.methods.getRecommendedProducts = async function() {
  // En un sistema real, se utilizaría un algoritmo de recomendación
  // basado en machine learning que compare las preferencias del usuario
  // con las características de los productos
  
  const Product = mongoose.model('Product');
  
  // Filtro inicial basado en preferencias explícitas
  const query = {
    // Filtrar por intensidades cercanas a la preferencia del usuario
    'attributes.intensity': {
      $gte: this.preferences.intensity - 1,
      $lte: this.preferences.intensity + 1
    }
  };
  
  // Si el usuario tiene preferencias de tostado
  if (this.preferredRoasts.length > 0) {
    query['attributes.roast'] = { $in: this.preferredRoasts };
  }
  
  // Si el usuario tiene preferencias de origen
  if (this.preferredOrigins.length > 0) {
    query['attributes.origin'] = { $in: this.preferredOrigins };
  }
  
  // Encontrar productos que coincidan con el perfil
  const matchingProducts = await Product.find(query)
    .limit(10)
    .exec();
  
  return matchingProducts;
};

/**
 * Método para calcular compatibilidad con un producto específico
 */
flavorProfileSchema.methods.calculateCompatibility = function(product) {
  if (!product.attributes) {
    return 0;
  }
  
  let score = 0;
  const weights = {
    intensity: 2,
    acidity: 1.5,
    bitterness: 1.5,
    sweetness: 1,
    body: 1
  };
  
  // Calcular puntuación de intensidad
  if (product.attributes.intensity) {
    const intensityDiff = Math.abs(this.preferences.intensity - product.attributes.intensity);
    score += (5 - intensityDiff) * weights.intensity;
  }
  
  // Calcular puntuación de acidez
  if (product.attributes.acidity) {
    const acidityDiff = Math.abs(this.preferences.acidity - product.attributes.acidity);
    score += (5 - acidityDiff) * weights.acidity;
  }
  
  // Calcular puntuación de amargor
  if (product.attributes.bitterness) {
    const bitternessDiff = Math.abs(this.preferences.bitterness - product.attributes.bitterness);
    score += (5 - bitternessDiff) * weights.bitterness;
  }
  
  // Calcular puntuación de dulzura
  if (product.attributes.sweetness) {
    const sweetnessDiff = Math.abs(this.preferences.sweetness - product.attributes.sweetness);
    score += (5 - sweetnessDiff) * weights.sweetness;
  }
  
  // Calcular puntuación de cuerpo
  if (product.attributes.body) {
    const bodyDiff = Math.abs(this.preferences.body - product.attributes.body);
    score += (5 - bodyDiff) * weights.body;
  }
  
  // Bonificación por tostado preferido
  if (product.attributes.roast && this.preferredRoasts.includes(product.attributes.roast)) {
    score += 5;
  }
  
  // Bonificación por origen preferido
  if (product.attributes.origin && this.preferredOrigins.includes(product.attributes.origin)) {
    score += 5;
  }
  
  // Bonificación por notas de sabor preferidas
  if (product.attributes.flavorNotes) {
    for (const note of product.attributes.flavorNotes) {
      if (this.flavorNotes.includes(note)) {
        score += 2;
      }
      if (this.avoidedFlavorNotes.includes(note)) {
        score -= 3;
      }
    }
  }
  
  // Normalizar puntuación a un valor entre 0 y 100
  const maxScore = 30; // Puntuación máxima teórica
  const normalizedScore = Math.min(Math.max(Math.round((score / maxScore) * 100), 0), 100);
  
  return normalizedScore;
};

module.exports = mongoose.model('FlavorProfile', flavorProfileSchema);
