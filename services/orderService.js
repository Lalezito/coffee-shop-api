// services/orderService.js
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const mongoose = require('mongoose');

/**
 * Crea un nuevo pedido basado en el carrito del usuario
 */
exports.createOrder = async (orderData) => {
  try {
    const { userId, userName, storeId, paymentMethod, notes, address } = orderData;
    
    if (!userId || !userName || !storeId) {
      throw new Error('Faltan datos requeridos para crear el pedido');
    }
    
    // Obtener el carrito del usuario
    const cart = await Cart.findOne({ userId });
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('El carrito está vacío o no existe');
    }
    
    // Crear el nuevo pedido
    const newOrder = new Order({
      userId,
      userName,
      storeId,
      items: cart.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        image: item.image,
        customizations: item.customizations
      })),
      total: cart.total,
      status: 'pending',
      notes: notes || '',
      paymentMethod: paymentMethod || 'credit_card',
      paymentStatus: 'pending',
      discounts: cart.discountCode ? [{
        code: cart.discountCode,
        amount: cart.discountAmount,
        type: 'fixed'
      }] : []
    });
    
    // Si se proporciona una dirección, guardarla en el pedido
    if (address) {
      newOrder.address = address;
    }
    
    // Guardar el pedido en la base de datos
    await newOrder.save();
    
    // Vaciar el carrito del usuario
    cart.items = [];
    cart.discountCode = null;
    cart.discountAmount = 0;
    await cart.save();
    
    return newOrder;
  } catch (error) {
    console.error('Error al crear pedido:', error);
    throw error;
  }
};

/**
 * Obtiene un pedido por su ID
 */
exports.getOrderById = async (orderId) => {
  try {
    if (!orderId) {
      throw new Error('Se requiere el ID del pedido');
    }
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('Pedido no encontrado');
    }
    
    return order;
  } catch (error) {
    console.error('Error al obtener pedido por ID:', error);
    throw error;
  }
};

/**
 * Actualiza el estado de un pedido
 */
exports.updateOrderStatus = async (orderId, status) => {
  try {
    if (!orderId || !status) {
      throw new Error('Se requiere el ID del pedido y el nuevo estado');
    }
    
    // Validar que el estado sea válido
    const validStatuses = ['pending', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Estado de pedido no válido');
    }
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('Pedido no encontrado');
    }
    
    // Actualizar el estado
    order.status = status;
    
    // Si se cancela, actualizar el estado de pago si está pendiente
    if (status === 'cancelled' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'cancelled';
    }
    
    // Si se completa, actualizar el estado de pago si está pendiente
    if (status === 'completed' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'completed';
    }
    
    await order.save();
    
    return order;
  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    throw error;
  }
};

/**
 * Obtiene el historial de pedidos de un usuario
 */
exports.getOrderHistory = async (userId, options = {}) => {
  try {
    if (!userId) {
      throw new Error('Se requiere el ID del usuario');
    }
    
    const { status, limit = 20, page = 1, sort = { createdAt: -1 } } = options;
    
    // Construir la consulta
    const query = { userId };
    
    // Filtrar por estado si se proporciona
    if (status) {
      query.status = status;
    }
    
    // Calcular el salto para la paginación
    const skip = (page - 1) * limit;
    
    // Ejecutar la consulta con paginación y ordenación
    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Obtener el total de pedidos para la paginación
    const total = await Order.countDocuments(query);
    
    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error al obtener historial de pedidos:', error);
    throw error;
  }
};

/**
 * Obtiene los pedidos activos de un usuario (no completados ni cancelados)
 */
exports.getActiveOrders = async (userId) => {
  try {
    if (!userId) {
      throw new Error('Se requiere el ID del usuario');
    }
    
    const orders = await Order.find({
      userId,
      status: { $nin: ['completed', 'cancelled'] }
    }).sort({ createdAt: -1 });
    
    return orders;
  } catch (error) {
    console.error('Error al obtener pedidos activos:', error);
    throw error;
  }
};

/**
 * Califica un pedido
 */
exports.rateOrder = async (orderId, ratingData) => {
  try {
    const { score, comment } = ratingData;
    
    if (!orderId || !score) {
      throw new Error('Se requiere el ID del pedido y una puntuación');
    }
    
    // Validar la puntuación
    if (score < 1 || score > 5) {
      throw new Error('La puntuación debe estar entre 1 y 5');
    }
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('Pedido no encontrado');
    }
    
    // Solo permitir calificar pedidos completados
    if (order.status !== 'completed') {
      throw new Error('Solo se pueden calificar pedidos completados');
    }
    
    // Actualizar la calificación
    order.rating = {
      score,
      comment: comment || '',
      createdAt: new Date()
    };
    
    await order.save();
    
    return order;
  } catch (error) {
    console.error('Error al calificar pedido:', error);
    throw error;
  }
};

/**
 * Calcula estadísticas de pedidos para un usuario
 */
exports.getUserOrderStats = async (userId) => {
  try {
    if (!userId) {
      throw new Error('Se requiere el ID del usuario');
    }
    
    // Obtener estadísticas básicas
    const stats = await Order.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Obtener productos más pedidos
    const topProducts = await Order.aggregate([
      { $match: { userId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalSpent: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);
    
    return {
      stats: stats.length > 0 ? stats[0] : {
        totalOrders: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        completedOrders: 0,
        cancelledOrders: 0
      },
      topProducts
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de pedidos:', error);
    throw error;
  }
};