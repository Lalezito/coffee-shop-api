const Order = require('../models/order.model');
const Store = require('../models/store.model');
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');

/**
 * Controlador para la gestión de pedidos
 */
class OrderController {
  /**
   * Obtener todos los pedidos (con filtros opcionales)
   */
  async getOrders(req, res) {
    try {
      const { userId, storeId, status, limit = 50, page = 1 } = req.query;
      const skip = (page - 1) * limit;
      
      // Construir filtros
      const filter = {};
      if (userId) filter.userId = userId;
      if (storeId) filter.storeId = storeId;
      if (status) filter.status = status;
      
      // Contar total para paginación
      const total = await Order.countDocuments(filter);
      
      // Obtener pedidos con paginación
      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      return res.status(StatusCodes.OK).json({
        success: true,
        count: orders.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: orders
      });
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al obtener pedidos',
        error: error.message
      });
    }
  }

  /**
   * Obtener un pedido por su ID
   */
  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'ID de pedido inválido'
        });
      }
      
      const order = await Order.findById(orderId);
      
      if (!order) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error al obtener pedido por ID:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al obtener detalles del pedido',
        error: error.message
      });
    }
  }
  
  /**
   * Obtener pedidos activos para una tienda
   */
  async getActiveOrdersForStore(req, res) {
    try {
      const { storeId } = req.params;
      
      // Verificar si la tienda existe
      const storeExists = await Store.findById(storeId);
      if (!storeExists) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Tienda no encontrada'
        });
      }
      
      // Obtener pedidos activos (no completados ni cancelados)
      const activeOrders = await Order.find({
        storeId,
        status: { $nin: ['completed', 'cancelled'] }
      }).sort({ createdAt: -1 });
      
      return res.status(StatusCodes.OK).json({
        success: true,
        count: activeOrders.length,
        data: activeOrders
      });
    } catch (error) {
      console.error('Error al obtener pedidos activos para tienda:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al obtener pedidos activos',
        error: error.message
      });
    }
  }
  
  /**
   * Obtener pedidos para un usuario
   */
  async getOrdersForUser(req, res) {
    try {
      const { userId } = req.params;
      const { status, limit = 20, page = 1 } = req.query;
      const skip = (page - 1) * limit;
      
      // Construir filtros
      const filter = { userId };
      if (status) filter.status = status;
      
      // Contar total para paginación
      const total = await Order.countDocuments(filter);
      
      // Obtener pedidos con paginación
      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      return res.status(StatusCodes.OK).json({
        success: true,
        count: orders.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: orders
      });
    } catch (error) {
      console.error('Error al obtener pedidos para usuario:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al obtener historial de pedidos',
        error: error.message
      });
    }
  }
  
  /**
   * Crear un nuevo pedido
   */
  async createOrder(req, res) {
    try {
      const orderData = req.body;
      
      // Verificar si la tienda existe
      const storeExists = await Store.findById(orderData.storeId);
      if (!storeExists) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Tienda no encontrada'
        });
      }
      
      // Crear el pedido
      const order = await Order.create(orderData);
      
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Pedido creado correctamente',
        data: order
      });
    } catch (error) {
      console.error('Error al crear pedido:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Error de validación',
          errors: Object.values(error.errors).map(err => err.message)
        });
      }
      
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al crear pedido',
        error: error.message
      });
    }
  }
  
  /**
   * Actualizar el estado de un pedido
   */
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'ID de pedido inválido'
        });
      }
      
      // Validar que el estado sea válido
      const validStatuses = ['pending', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Estado de pedido inválido'
        });
      }
      
      // Actualizar el estado del pedido
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { status },
        { new: true, runValidators: true }
      );
      
      if (!updatedOrder) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Estado del pedido actualizado correctamente',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al actualizar estado del pedido',
        error: error.message
      });
    }
  }
  
  /**
   * Agregar calificación a un pedido
   */
  async addRatingToOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { score, comment } = req.body;
      
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'ID de pedido inválido'
        });
      }
      
      // Validar score
      if (score < 1 || score > 5) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'La calificación debe estar entre 1 y 5'
        });
      }
      
      // Actualizar la calificación del pedido
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { 
          rating: {
            score,
            comment,
            createdAt: new Date()
          }
        },
        { new: true, runValidators: true }
      );
      
      if (!updatedOrder) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Calificación agregada correctamente',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error al agregar calificación:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al agregar calificación',
        error: error.message
      });
    }
  }
  
  /**
   * Actualizar información de pago
   */
  async updatePaymentInfo(req, res) {
    try {
      const { orderId } = req.params;
      const { paymentMethod, paymentStatus } = req.body;
      
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'ID de pedido inválido'
        });
      }
      
      // Validar método de pago
      const validPaymentMethods = ['cash', 'credit_card', 'debit_card', 'mobile_payment', 'loyalty_points'];
      if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Método de pago inválido'
        });
      }
      
      // Validar estado de pago
      const validPaymentStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Estado de pago inválido'
        });
      }
      
      // Crear objeto de actualización
      const updateData = {};
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      
      // Actualizar información de pago
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!updatedOrder) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Información de pago actualizada correctamente',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error al actualizar información de pago:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al actualizar información de pago',
        error: error.message
      });
    }
  }
}

module.exports = new OrderController();
