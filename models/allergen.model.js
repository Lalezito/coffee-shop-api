const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Esquema para los alérgenos que pueden estar presentes en los productos
 */
const allergenSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  icon: {
    type: String,
    default: 'allergen-default'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  commonIn: {
    type: [String],
    default: []
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
 * Esquema para las configuraciones de alérgenos de los usuarios
 */
const userAllergenSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  allergens: [{
    allergenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Allergen',
      required: true
    },
    allergenName: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'moderate'
    },
    avoid: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      default: ''
    }
  }],
  additionalNotes: {
    type: String,
    default: ''
  },
  alertPreference: {
    type: String,
    enum: ['none', 'warning', 'block'],
    default: 'warning'
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
 * Método para verificar si un producto es seguro para el usuario
 */
userAllergenSchema.methods.isProductSafe = async function(productId) {
  try {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId).populate('ingredients.allergens');
    
    if (!product) {
      throw new Error('Producto no encontrado');
    }
    
    // Crear un mapa de los alérgenos del usuario y su nivel de severidad
    const userAllergenMap = new Map();
    this.allergens.forEach(allergen => {
      if (allergen.avoid) {
        userAllergenMap.set(allergen.allergenId.toString(), allergen.level);
      }
    });
    
    // Si el usuario no tiene alérgenos a evitar, el producto es seguro
    if (userAllergenMap.size === 0) {
      return { 
        safe: true, 
        warnings: [],
        severity: 'none'
      };
    }
    
    // Comprobar si algún ingrediente del producto contiene alérgenos a evitar
    const warnings = [];
    let highestSeverity = 'none';
    
    // Para cada ingrediente del producto
    for (const ingredient of product.ingredients) {
      // Para cada alérgeno en el ingrediente
      for (const allergenId of ingredient.allergens) {
        const allergenIdStr = allergenId.toString();
        
        // Si el usuario debe evitar este alérgeno
        if (userAllergenMap.has(allergenIdStr)) {
          const severity = userAllergenMap.get(allergenIdStr);
          warnings.push({
            ingredient: ingredient.name,
            allergen: allergenId,
            severity: severity
          });
          
          // Actualizar el nivel de severidad más alto
          if (severity === 'severe' || highestSeverity === 'none') {
            highestSeverity = 'severe';
          } else if (severity === 'moderate' && highestSeverity !== 'severe') {
            highestSeverity = 'moderate';
          } else if (severity === 'mild' && highestSeverity === 'none') {
            highestSeverity = 'mild';
          }
        }
      }
    }
    
    return {
      safe: warnings.length === 0,
      warnings: warnings,
      severity: highestSeverity
    };
  } catch (error) {
    console.error('Error verificando la seguridad del producto:', error);
    return { 
      safe: false, 
      error: error.message,
      warnings: [],
      severity: 'unknown'
    };
  }
};

/**
 * Método para filtrar productos por seguridad alérgica
 */
userAllergenSchema.methods.filterSafeProducts = async function(products) {
  try {
    const Product = mongoose.model('Product');
    const safeProducts = [];
    
    for (const product of products) {
      const safetyCheck = await this.isProductSafe(product._id);
      if (safetyCheck.safe) {
        safeProducts.push(product);
      }
    }
    
    return safeProducts;
  } catch (error) {
    console.error('Error filtrando productos seguros:', error);
    return [];
  }
};

const Allergen = mongoose.model('Allergen', allergenSchema);
const UserAllergen = mongoose.model('UserAllergen', userAllergenSchema);

module.exports = {
  Allergen,
  UserAllergen
};
