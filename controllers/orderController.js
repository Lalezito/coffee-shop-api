// controllers/orderController.js
const orderService = require('../services/orderService');

exports.createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({
      success: true,
      data: order,
      message: 'Orden creada correctamente'
    });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error al crear la orden'
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Orden no encontrada' 
      });
    }
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error al obtener orden:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error al obtener la orden'
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const updatedOrder = await orderService.updateOrderStatus(req.params.orderId, req.body.status);
    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: 'Estado de la orden actualizado correctamente'
    });
  } catch (error) {
    console.error('Error al actualizar estado de orden:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error al actualizar el estado de la orden'
    });
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    const orders = await orderService.getOrderHistory(req.params.userId);
    res.status(200).json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error al obtener historial de órdenes:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error al obtener el historial de órdenes'
    });
  }
};
