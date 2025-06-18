/**
 * Servicio para la gestión de pedidos
 * Centraliza la lógica de negocio relacionada con los pedidos
 */

const Order = require('../models/order.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// Manejo de errores
class OrderError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'OrderError';
    this.status = status;
  }
}

class OrderService {
  /**
   * Obtiene todos los pedidos con opciones de filtrado y paginación
   */
  async getAllOrders(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        sortBy = 'createdAt', 
        sortOrder = -1,
        storeId,
        startDate,
        endDate
      } = options;

      // Construir el filtro basado en las opciones proporcionadas
      let filter = {};
      
      if (status) {
        filter.status = status;
      }
      
      if (storeId) {
        filter.storeId = storeId;
      }
      
      // Filtro de fechas
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.createdAt.$lte = new Date(endDate);
        }
      }

      // Opciones de ordenamiento
      const sort = {};
      sort[sortBy] = sortOrder;

      // Calcular el skip para la paginación
      const skip = (page - 1) * limit;

      // Ejecutar la consulta
      const orders = await Order.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Obtener el total de pedidos (para la paginación)
      const total = await Order.countDocuments(filter);

      return {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en OrderService.getAllOrders:', error);
      throw new OrderError('Error al obtener los pedidos', 500);
    }
  }

  /**
   * Obtener un pedido por su ID
   */
  async getOrderById(orderId, userId = null) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new OrderError('Pedido no encontrado', 404);
      }
      
      // Si se proporciona un userId, verificar que el pedido pertenezca al usuario
      if (userId && order.userId !== userId) {
        // Verificar si el usuario tiene rol admin (pueden ver cualquier pedido)
        const user = await User.findOne({ userId });
        if (!user || user.role !== 'admin') {
          throw new OrderError('No tienes permiso para ver este pedido', 403);
        }
      }
      
      return order;
    } catch (error) {
      console.error('Error en OrderService.getOrderById:', error);
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Error al obtener el pedido', 500);
    }
  }

  /**
   * Crear un nuevo pedido
   */
  async createOrder(orderData) {
    try {
      // Validar datos mínimos requeridos
      if (!orderData.userId || !orderData.items || !orderData.items.length) {
        throw new OrderError('Datos de pedido incompletos: se requiere userId e items');
      }
      
      // Calcular el total del pedido si no se proporciona
      if (!orderData.total) {
        orderData.total = orderData.items.reduce(
          (sum, item) => sum + (item.price * item.quantity), 0
        );
      }
      
      // Asignar valores por defecto
      const newOrderData = {
        ...orderData,
        status: orderData.status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Crear el nuevo pedido
      const order = new Order(newOrderData);
      await order.save();
      
      // Actualizar historial de pedidos del usuario
      await User.findOneAndUpdate(
        { userId: orderData.userId },
        { $push: { orderHistory: order._id.toString() } }
      );
      
      return order;
    } catch (error) {
      console.error('Error en OrderService.createOrder:', error);
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Error al crear el pedido', 500);
    }
  }

  /**
   * Actualizar el estado de un pedido
   */
  async updateOrderStatus(orderId, status, updatedBy = null) {
    try {
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
      
      if (!validStatuses.includes(status)) {
        throw new OrderError(`Estado de pedido no válido. Debe ser uno de: ${validStatuses.join(', ')}`);
      }
      
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new OrderError('Pedido no encontrado', 404);
      }
      
      // Actualizar el estado
      order.status = status;
      order.updatedAt = new Date();
      
      // Si se proporciona quién actualiza, agregar al historial de cambios
      if (updatedBy) {
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          status,
          updatedBy,
          timestamp: new Date()
        });
      }
      
      await order.save();
      return order;
    } catch (error) {
      console.error('Error en OrderService.updateOrderStatus:', error);
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Error al actualizar el estado del pedido', 500);
    }
  }

  /**
   * Obtener los pedidos de un usuario específico
   */
  async getOrdersByUserId(userId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status,
        sortBy = 'createdAt', 
        sortOrder = -1
      } = options;

      // Construir el filtro
      let filter = { userId };
      
      if (status) {
        filter.status = status;
      }

      // Opciones de ordenamiento
      const sort = {};
      sort[sortBy] = sortOrder;

      // Calcular el skip para la paginación
      const skip = (page - 1) * limit;

      // Ejecutar la consulta
      const orders = await Order.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Obtener el total de pedidos para este usuario
      const total = await Order.countDocuments(filter);

      return {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error en OrderService.getOrdersByUserId:', error);
      throw new OrderError('Error al obtener los pedidos del usuario', 500);
    }
  }

  /**
   * Verificar si un usuario ha comprado un producto específico (para validar reseñas)
   */
  async hasUserPurchasedProduct(userId, productId) {
    try {
      // Buscar pedidos completados del usuario que contienen el producto
      const orders = await Order.find({
        userId,
        status: 'completed',
        'items.productId': productId
      });
      
      return orders.length > 0;
    } catch (error) {
      console.error('Error en OrderService.hasUserPurchasedProduct:', error);
      throw new OrderError('Error al verificar las compras del usuario', 500);
    }
  }

  /**
   * Agregar calificación a un pedido
   */
  async addRatingToOrder(orderId, userId, rating, comment = null) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new OrderError('Pedido no encontrado', 404);
      }
      
      // Verificar que el pedido pertenezca al usuario
      if (order.userId !== userId) {
        throw new OrderError('No tienes permiso para calificar este pedido', 403);
      }
      
      // Verificar que el pedido esté completado
      if (order.status !== 'completed') {
        throw new OrderError('Solo se pueden calificar pedidos completados');
      }
      
      // Verificar que no se haya calificado ya
      if (order.rating) {
        throw new OrderError('Este pedido ya ha sido calificado');
      }
      
      // Actualizar el pedido con la calificación
      order.rating = {
        score: rating,
        comment,
        createdAt: new Date()
      };
      
      await order.save();
      return order;
    } catch (error) {
      console.error('Error en OrderService.addRatingToOrder:', error);
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Error al calificar el pedido', 500);
    }
  }

  /**
   * Obtener los pedidos activos para una tienda específica
   */
  async getActiveOrdersForStore(storeId) {
    try {
      // Los pedidos activos son aquellos que están en proceso (no completados ni cancelados)
      const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
      
      const orders = await Order.find({
        storeId,
        status: { $in: activeStatuses }
      }).sort({ createdAt: 1 }); // Los más antiguos primero
      
      return orders;
    } catch (error) {
      console.error('Error en OrderService.getActiveOrdersForStore:', error);
      throw new OrderError('Error al obtener los pedidos activos de la tienda', 500);
    }
  }

  /**
   * Actualizar la información de pago de un pedido
   */
  async updatePaymentInfo(orderId, paymentInfo) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new OrderError('Pedido no encontrado', 404);
      }
      
      // Actualizar la información de pago
      order.paymentStatus = paymentInfo.status || order.paymentStatus;
      order.paymentMethod = paymentInfo.method || order.paymentMethod;
      
      // Si hay transacción, actualizar
      if (paymentInfo.transactionId) {
        order.transactionId = paymentInfo.transactionId;
      }
      
      // Si el pago se completó, actualizar la fecha
      if (paymentInfo.status === 'paid' && !order.paidAt) {
        order.paidAt = new Date();
      }
      
      order.updatedAt = new Date();
      await order.save();
      
      return order;
    } catch (error) {
      console.error('Error en OrderService.updatePaymentInfo:', error);
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Error al actualizar la información de pago', 500);
    }
  }
}

module.exports = new OrderService();
