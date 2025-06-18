const Product = require('../models/product.model');
const Order = require('../models/order.model');

// Obtener todos los productos
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, featured, sort, limit = 20, page = 1 } = req.query;
    
    // Construir filtro
    const filter = {};
    
    if (category) {
      filter.categoryId = category;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (featured === 'true') {
      filter.featured = true;
    }
    
    // Solo productos disponibles por defecto
    if (!req.query.includeUnavailable) {
      filter.available = true;
    }

    // Opciones de paginación
    const options = {
      skip: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit)
    };

    // Opciones de ordenamiento
    let sortOptions = {};
    if (sort) {
      // sort puede ser: price_asc, price_desc, name_asc, name_desc, rating_desc
      const [field, direction] = sort.split('_');
      sortOptions[field] = direction === 'desc' ? -1 : 1;
    } else {
      // Por defecto ordenar por nombre ascendente
      sortOptions = { name: 1 };
    }
    
    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(options.skip)
      .limit(options.limit);
    
    // Obtener el conteo total para la paginación
    const total = await Product.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: products
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos'
    });
  }
};

// Obtener un producto por ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto'
    });
  }
};

// Crear un nuevo producto
exports.createProduct = async (req, res) => {
  try {
    // Verificar permisos - middleware de autorización implementado en las rutas
    
    const {
      name,
      description,
      price,
      image,
      categoryId,
      stock,
      available,
      isPopular,
      isOffer,
      isGlutenFree,
      isVegan,
      featured
    } = req.body;
    
    // Validación básica
    if (!name || !description || !price || !image || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporcione todos los campos requeridos'
      });
    }
    
    // Crear el producto
    const product = await Product.create({
      name,
      description,
      price,
      image,
      categoryId,
      stock: stock || 0,
      available: available !== undefined ? available : true,
      isPopular: isPopular || false,
      isOffer: isOffer || false,
      isGlutenFree: isGlutenFree || false,
      isVegan: isVegan || false,
      featured: featured || false
    });
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al crear producto'
    });
  }
};

// Actualizar un producto existente
exports.updateProduct = async (req, res) => {
  try {
    // Verificar permisos - middleware de autorización implementado en las rutas
    
    const productId = req.params.id;
    const updateData = { ...req.body };
    
    // Verificar si el producto existe
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Actualizar el producto
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al actualizar producto'
    });
  }
};

// Eliminar un producto
exports.deleteProduct = async (req, res) => {
  try {
    // Verificar permisos - middleware de autorización implementado en las rutas
    
    const productId = req.params.id;
    
    // Verificar si el producto existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Eliminar el producto
    await Product.findByIdAndDelete(productId);
    
    res.status(200).json({
      success: true,
      message: 'Producto eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al eliminar producto'
    });
  }
};

// Actualizar stock de un producto
exports.updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    
    if (stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'El valor de stock es requerido'
      });
    }
    
    const product = await Product.findByIdAndUpdate(
      id,
      { stock },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar stock del producto'
    });
  }
};

// Obtener productos con poco stock
exports.getLowStockProducts = async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    
    const products = await Product.find({
      stock: { $lte: parseInt(threshold) },
      available: true
    }).sort({ stock: 1 });
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error al obtener productos con poco stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos con poco stock'
    });
  }
};

// Obtener productos más vendidos
exports.getBestSellingProducts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Obtener productos más vendidos basado en estadísticas reales de órdenes
    const bestSellers = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.productId',
          totalSales: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: parseInt(limit) },
      { $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      { $project: {
          _id: '$productDetails._id',
          name: '$productDetails.name',
          description: '$productDetails.description',
          price: '$productDetails.price',
          image: '$productDetails.image',
          totalSales: 1,
          revenue: 1,
          available: '$productDetails.available'
        }
      }
    ]);

    // Si no hay datos de ventas, usar productos populares como fallback
    let products = bestSellers;
    if (bestSellers.length === 0) {
      products = await Product.find({ available: true })
        .sort({ isPopular: -1, rating: -1 })
        .limit(parseInt(limit));
    }
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos más vendidos'
    });
  }
};