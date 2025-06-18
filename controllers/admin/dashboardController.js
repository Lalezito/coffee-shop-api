/**
 * Controlador para el panel de administración
 */
const logger = require('../../utils/logger');
const DailyStat = require('../../models/admin/dashboard');
const Order = require('../../models/order.model');
const Product = require('../../models/product.model');
const User = require('../../models/user.model');

/**
 * Obtener estadísticas del dashboard
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Fechas para filtrado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - 7);
    
    const lastMonthStart = new Date(today);
    lastMonthStart.setMonth(today.getMonth() - 1);
    
    // Consultas reales a la base de datos
    const [
      dailySales,
      weeklySales,
      monthlySales,
      todayOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalProducts,
      lowStockProducts,
      totalCustomers,
      newCustomers,
      activeCustomers
    ] = await Promise.all([
      // Ventas diarias
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      // Ventas semanales
      Order.aggregate([
        { $match: { createdAt: { $gte: lastWeekStart }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      // Ventas mensuales
      Order.aggregate([
        { $match: { createdAt: { $gte: lastMonthStart }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      // Órdenes de hoy
      Order.countDocuments({ createdAt: { $gte: today } }),
      // Órdenes pendientes
      Order.countDocuments({ status: 'pending' }),
      // Órdenes completadas hoy
      Order.countDocuments({ createdAt: { $gte: today }, status: 'completed' }),
      // Órdenes canceladas hoy
      Order.countDocuments({ createdAt: { $gte: today }, status: 'cancelled' }),
      // Total de productos
      Product.countDocuments({ available: true }),
      // Productos con poco stock
      Product.countDocuments({ stock: { $lte: 10 }, available: true }),
      // Total de clientes
      User.countDocuments({ role: 'user' }),
      // Nuevos clientes hoy
      User.countDocuments({ createdAt: { $gte: today }, role: 'user' }),
      // Clientes activos (con órdenes en la última semana)
      Order.distinct('userId', { createdAt: { $gte: lastWeekStart } })
    ]);

    // Productos más vendidos
    const bestSellers = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          sales: { $sum: '$items.quantity' }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 3 }
    ]);

    const dashboardStats = {
      sales: {
        daily: dailySales[0]?.total || 0,
        weekly: weeklySales[0]?.total || 0,
        monthly: monthlySales[0]?.total || 0,
      },
      orders: {
        today: todayOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        bestSellers: bestSellers.map(item => ({
          name: item.name,
          sales: item.sales
        }))
      },
      customers: {
        total: totalCustomers,
        new: newCustomers,
        active: activeCustomers.length,
      }
    };

    return res.status(200).json({
      success: true,
      data: dashboardStats
    });

  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del dashboard',
      error: error.message
    });
  }
};

/**
 * Obtener datos para el gráfico de ventas semanales
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.getWeeklySalesChart = async (req, res) => {
  try {
    // Obtener los últimos 7 días
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);

    // Consulta real a la base de datos para obtener ventas por día
    const salesByDay = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: weekAgo },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          sales: { $sum: '$total' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Crear array con todos los días de la semana
    const weeklyData = [];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const dayData = salesByDay.find(item => 
        item._id.year === date.getFullYear() &&
        item._id.month === date.getMonth() + 1 &&
        item._id.day === date.getDate()
      );
      
      weeklyData.push({
        day: dayNames[date.getDay()],
        sales: dayData ? dayData.sales : 0,
        date: date.toISOString().split('T')[0]
      });
    }

    return res.status(200).json({
      success: true,
      data: weeklyData
    });

  } catch (error) {
    console.error('Error al obtener datos del gráfico de ventas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos del gráfico de ventas',
      error: error.message
    });
  }
};

/**
 * Obtener productos más vendidos
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.getBestSellingProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Consulta real a la base de datos para obtener productos más vendidos
    const bestSellers = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalSales: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: limit }
    ]);

    // Obtener información adicional de productos si es necesario
    const enrichedBestSellers = await Promise.all(
      bestSellers.map(async (item) => {
        try {
          const product = await Product.findById(item._id);
          return {
            productId: item._id,
            name: item.productName,
            totalSales: item.totalSales,
            revenue: Math.round(item.revenue * 100) / 100, // Redondear a 2 decimales
            image: product?.image || 'default-product.png'
          };
        } catch (error) {
          // Si no se encuentra el producto, usar datos básicos
          return {
            productId: item._id,
            name: item.productName,
            totalSales: item.totalSales,
            revenue: Math.round(item.revenue * 100) / 100,
            image: 'default-product.png'
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      count: enrichedBestSellers.length,
      data: enrichedBestSellers
    });

  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener productos más vendidos',
      error: error.message
    });
  }
};

/**
 * Obtener resumen de inventario (productos con poco stock)
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.getLowStockProducts = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    
    // Consulta real a la base de datos para obtener productos con poco stock
    const lowStockProducts = await Product.find({
      stock: { $lte: threshold },
      available: true
    }).select('name stock').sort({ stock: 1 });

    // Formatear los datos para incluir el estado basado en el stock
    const formattedProducts = lowStockProducts.map(product => ({
      id: product._id,
      name: product.name,
      stock: product.stock,
      threshold: threshold,
      status: product.stock <= threshold * 0.3 ? 'crítico' : 'bajo'
    }));

    return res.status(200).json({
      success: true,
      count: formattedProducts.length,
      data: formattedProducts
    });

  } catch (error) {
    console.error('Error al obtener productos con poco stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener productos con poco stock',
      error: error.message
    });
  }
};

/**
 * Implementación real de una función del panel de administración:
 * Actualizar estadísticas diarias para un producto visto
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.recordProductView = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del producto'
      });
    }

    // Verificar si el producto existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Registrar la visualización en las estadísticas diarias
    await DailyStat.addProductView(productId);

    return res.status(200).json({
      success: true,
      message: 'Vista de producto registrada correctamente'
    });

  } catch (error) {
    console.error('Error al registrar vista de producto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar vista de producto',
      error: error.message
    });
  }
};