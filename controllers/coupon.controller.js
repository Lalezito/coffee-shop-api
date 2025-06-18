const Coupon = require('../models/coupon.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');

/**
 * Controlador para la gestión de cupones y descuentos
 */
class CouponController {
  /**
   * Obtener todos los cupones (con filtros opcionales)
   */
  async getCoupons(req, res) {
    try {
      const { code, type, isActive, limit = 50, page = 1 } = req.query;
      const skip = (page - 1) * limit;
      
      // Construir filtros
      const filter = {};
      if (code) filter.code = new RegExp(code, 'i');
      if (type) filter.type = type;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      
      // Filtrar cupones expirados
      if (req.query.excludeExpired === 'true') {
        filter.expirationDate = { $gt: new Date() };
      }
      
      // Contar total para paginación
      const total = await Coupon.countDocuments(filter);
      
      // Obtener cupones con paginación
      const coupons = await Coupon.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      return res.status(StatusCodes.OK).json({
        success: true,
        count: coupons.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: coupons
      });
    } catch (error) {
      console.error('Error al obtener cupones:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al obtener cupones',
        error: error.message
      });
    }
  }

  /**
   * Obtener un cupón por su ID
   */
  async getCouponById(req, res) {
    try {
      const { couponId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(couponId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'ID de cupón inválido'
        });
      }
      
      const coupon = await Coupon.findById(couponId);
      
      if (!coupon) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Cupón no encontrado'
        });
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        data: coupon
      });
    } catch (error) {
      console.error('Error al obtener cupón por ID:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al obtener detalles del cupón',
        error: error.message
      });
    }
  }
  
  /**
   * Obtener un cupón por su código
   */
  async getCouponByCode(req, res) {
    try {
      const { code } = req.params;
      
      const coupon = await Coupon.findOne({ 
        code: code.toUpperCase(),
        isActive: true
      });
      
      if (!coupon) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Cupón no encontrado o inactivo'
        });
      }
      
      // Verificar si el cupón ha expirado
      if (coupon.isExpired()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'El cupón ha expirado'
        });
      }
      
      // Verificar si el cupón ha alcanzado su máximo de uso
      if (coupon.isMaxedOut()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'El cupón ha alcanzado su límite de uso'
        });
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        data: coupon
      });
    } catch (error) {
      console.error('Error al obtener cupón por código:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al obtener detalles del cupón',
        error: error.message
      });
    }
  }
  
  /**
   * Crear un nuevo cupón
   */
  async createCoupon(req, res) {
    try {
      const couponData = req.body;
      
      // Verificar si ya existe un cupón con el mismo código
      const existingCoupon = await Coupon.findOne({ code: couponData.code.toUpperCase() });
      if (existingCoupon) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: 'Ya existe un cupón con este código'
        });
      }
      
      // Asegurarse que el código esté en mayúsculas
      couponData.code = couponData.code.toUpperCase();
      
      // Crear el cupón
      const coupon = await Coupon.create(couponData);
      
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Cupón creado correctamente',
        data: coupon
      });
    } catch (error) {
      console.error('Error al crear cupón:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Error de validación',
          errors: Object.values(error.errors).map(err => err.message)
        });
      }
      
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al crear cupón',
        error: error.message
      });
    }
  }
  
  /**
   * Actualizar un cupón existente
   */
  async updateCoupon(req, res) {
    try {
      const { couponId } = req.params;
      const updates = req.body;
      
      if (!mongoose.Types.ObjectId.isValid(couponId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'ID de cupón inválido'
        });
      }
      
      // Si se está actualizando el código, verificar que no exista otro cupón con el mismo código
      if (updates.code) {
        updates.code = updates.code.toUpperCase();
        const existingCoupon = await Coupon.findOne({ 
          code: updates.code,
          _id: { $ne: couponId }
        });
        
        if (existingCoupon) {
          return res.status(StatusCodes.CONFLICT).json({
            success: false,
            message: 'Ya existe otro cupón con este código'
          });
        }
      }
      
      // Actualizar el cupón
      const updatedCoupon = await Coupon.findByIdAndUpdate(
        couponId,
        updates,
        { new: true, runValidators: true }
      );
      
      if (!updatedCoupon) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Cupón no encontrado'
        });
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Cupón actualizado correctamente',
        data: updatedCoupon
      });
    } catch (error) {
      console.error('Error al actualizar cupón:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Error de validación',
          errors: Object.values(error.errors).map(err => err.message)
        });
      }
      
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al actualizar cupón',
        error: error.message
      });
    }
  }
  
  /**
   * Eliminar un cupón
   */
  async deleteCoupon(req, res) {
    try {
      const { couponId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(couponId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'ID de cupón inválido'
        });
      }
      
      const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
      
      if (!deletedCoupon) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Cupón no encontrado'
        });
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Cupón eliminado correctamente'
      });
    } catch (error) {
      console.error('Error al eliminar cupón:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al eliminar cupón',
        error: error.message
      });
    }
  }
  
  /**
   * Validar un cupón para un carrito específico
   */
  async validateCouponForCart(req, res) {
    try {
      const { code } = req.params;
      const { cartTotal, productIds, userId } = req.body;
      
      // Verificar datos obligatorios
      if (!cartTotal) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'El total del carrito es obligatorio'
        });
      }
      
      // Buscar el cupón por código
      const coupon = await Coupon.findOne({ 
        code: code.toUpperCase(),
        isActive: true
      });
      
      if (!coupon) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Cupón no encontrado o inactivo'
        });
      }
      
      // Verificar validez del cupón
      if (!coupon.isValid()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: coupon.isExpired() 
            ? 'El cupón ha expirado' 
            : 'El cupón ha alcanzado su límite de uso'
        });
      }
      
      // Verificar monto mínimo
      if (!coupon.isApplicableToAmount(cartTotal)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `El monto mínimo para este cupón es $${coupon.minimumPurchase}`
        });
      }
      
      // Verificar si el cupón es de un solo uso y el usuario ya lo usó
      if (coupon.isOnetime && userId) {
        const hasUsed = await Order.exists({
          'userId': userId,
          'discounts.code': code.toUpperCase()
        });
        
        if (hasUsed) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Este cupón es de un solo uso y ya ha sido utilizado'
          });
        }
      }
      
      // Calcular el descuento
      const discountAmount = coupon.calculateDiscount(cartTotal, productIds || []);
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Cupón válido',
        data: {
          coupon,
          discountAmount,
          finalTotal: Math.max(0, cartTotal - discountAmount)
        }
      });
    } catch (error) {
      console.error('Error al validar cupón:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al validar cupón',
        error: error.message
      });
    }
  }
  
  /**
   * Obtener descuentos personalizados para un usuario específico
   */
  async getPersonalizedCoupons(req, res) {
    try {
      const { userId } = req.params;
      
      // Obtener datos del usuario y su comportamiento
      const user = await User.findById(userId);
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Obtener historial de pedidos del usuario
      const userOrders = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);
      
      // Calcular métricas relevantes
      const totalSpent = userOrders.reduce((sum, order) => sum + order.total, 0);
      const orderFrequency = userOrders.length > 0 
        ? userOrders.length / ((Date.now() - new Date(userOrders[userOrders.length-1].createdAt).getTime()) / (1000 * 60 * 60 * 24)) 
        : 0;
      const daysSinceLastOrder = userOrders.length > 0 
        ? Math.floor((Date.now() - new Date(userOrders[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)) 
        : null;
      
      // Obtener todos los productos comprados
      const productsPurchased = userOrders.flatMap(order => 
        order.items.map(item => item.productId)
      );
      
      // Buscar cupones activos aplicables al usuario según su comportamiento
      const coupons = await Coupon.find({
        isActive: true,
        expirationDate: { $gt: new Date() },
        $or: [
          // Cupones sin reglas de comportamiento (para todos)
          { userBehaviorRules: { $size: 0 } },
          
          // Cupones para usuarios frecuentes
          { 
            'userBehaviorRules.metric': 'orderFrequency',
            'userBehaviorRules.condition': 'greaterThan',
            'userBehaviorRules.value': { $lt: orderFrequency }
          },
          
          // Cupones para usuarios que gastan mucho
          {
            'userBehaviorRules.metric': 'totalSpent',
            'userBehaviorRules.condition': 'greaterThan',
            'userBehaviorRules.value': { $lt: totalSpent }
          },
          
          // Cupones para recuperar usuarios inactivos
          {
            'userBehaviorRules.metric': 'daysSinceLastOrder',
            'userBehaviorRules.condition': 'greaterThan',
            'userBehaviorRules.value': { $lt: daysSinceLastOrder }
          },
          
          // Cupones para productos específicos que el usuario ha comprado
          {
            'userBehaviorRules.metric': 'productPurchased',
            'userBehaviorRules.condition': 'contains',
            'userBehaviorRules.value': { $in: productsPurchased }
          }
        ]
      }).sort({ value: -1 }).limit(5);
      
      return res.status(StatusCodes.OK).json({
        success: true,
        count: coupons.length,
        data: coupons
      });
    } catch (error) {
      console.error('Error al obtener cupones personalizados:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al obtener cupones personalizados',
        error: error.message
      });
    }
  }
  
  /**
   * Obtener descuentos aplicables por hora actual
   */
  async getTimeBasedCoupons(req, res) {
    try {
      const { storeId, occupancyLevel } = req.query;
      
      // Obtener la hora y día actual
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay(); // 0-6 (domingo a sábado)
      
      // Buscar cupones basados en restricciones de tiempo
      const timeCoupons = await Coupon.find({
        isActive: true,
        expirationDate: { $gt: now },
        'timeRestrictions.daysOfWeek': currentDay,
        'timeRestrictions.startHour': { $lte: currentHour },
        'timeRestrictions.endHour': { $gte: currentHour }
      });
      
      // Filtrar por nivel de ocupación si se proporciona
      let filteredCoupons = timeCoupons;
      if (occupancyLevel) {
        filteredCoupons = timeCoupons.filter(coupon => 
          !coupon.timeRestrictions.storeOccupancyLevel || 
          coupon.timeRestrictions.storeOccupancyLevel === 'any' ||
          coupon.timeRestrictions.storeOccupancyLevel === occupancyLevel
        );
      }
      
      // Filtrar por tienda si se proporciona
      if (storeId) {
        filteredCoupons = filteredCoupons.filter(coupon => 
          !coupon.applicableStoreIds || 
          coupon.applicableStoreIds.length === 0 ||
          coupon.applicableStoreIds.includes(storeId)
        );
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        count: filteredCoupons.length,
        data: filteredCoupons
      });
    } catch (error) {
      console.error('Error al obtener cupones por hora:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al obtener cupones por hora',
        error: error.message
      });
    }
  }
  
  /**
   * Crear un cupón de referido
   */
  async createReferralCoupon(req, res) {
    try {
      const { referrerId } = req.params;
      const { referredEmail } = req.body;
      
      // Verificar datos obligatorios
      if (!referredEmail) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'El email del referido es obligatorio'
        });
      }
      
      // Verificar si el usuario referidor existe
      const referrer = await User.findById(referrerId);
      if (!referrer) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Usuario referidor no encontrado'
        });
      }
      
      // Generar código único para el cupón
      const referralCode = `REF-${referrer.username.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      // Crear cupón de referido
      const referralCoupon = await Coupon.create({
        code: referralCode,
        title: 'Cupón de referido',
        description: `Cupón de referido de ${referrer.username}`,
        type: 'percentage',
        value: 10, // 10% de descuento
        minimumPurchase: 10,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        isActive: true,
        isOnetime: true,
        referralDetails: {
          referrerId: referrerId,
          referredEmail: referredEmail,
          referrerReward: 5, // 5% de recompensa para el referidor
          referredReward: 10, // 10% de descuento para el referido
          validForNewUsersOnly: true
        }
      });
      
      // Enviar email al referido con el código (simulado)
      console.log(`Enviando email a ${referredEmail} con código de referido ${referralCode}`);
      
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Cupón de referido creado correctamente',
        data: referralCoupon
      });
    } catch (error) {
      console.error('Error al crear cupón de referido:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al crear cupón de referido',
        error: error.message
      });
    }
  }
  
  /**
   * Aplicar cashback a un usuario
   */
  async applyCashback(req, res) {
    try {
      const { userId } = req.params;
      const { orderId, amount } = req.body;
      
      // Verificar datos obligatorios
      if (!orderId || !amount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'El ID del pedido y el monto son obligatorios'
        });
      }
      
      // Verificar si el usuario existe
      const user = await User.findById(userId);
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      // Verificar si el pedido existe
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      // Calcular el monto de cashback (5% del total del pedido)
      const cashbackAmount = Math.round((amount * 0.05) * 100) / 100;
      
      // Crear cupón de cashback
      const cashbackCode = `CASH-${userId.substring(0, 4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const cashbackCoupon = await Coupon.create({
        code: cashbackCode,
        title: 'Cashback',
        description: `Cashback de tu pedido #${orderId}`,
        type: 'fixedAmount',
        value: cashbackAmount,
        minimumPurchase: cashbackAmount * 2, // Mínimo de compra de 2 veces el cashback
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días
        isActive: true,
        isOnetime: true,
        cashbackDetails: {
          orderId: orderId,
          originalAmount: amount,
          percentage: 5
        }
      });
      
      // Actualizar el pedido con la información del cashback
      order.cashbackApplied = {
        couponId: cashbackCoupon.id,
        amount: cashbackAmount,
        createdAt: new Date()
      };
      await order.save();
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Cashback aplicado correctamente',
        data: {
          cashbackCoupon,
          amount: cashbackAmount
        }
      });
    } catch (error) {
      console.error('Error al aplicar cashback:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al aplicar cashback',
        error: error.message
      });
    }
  }
  
  /**
   * Generar cupones para fechas especiales
   */
  async generateSpecialDateCoupons(req, res) {
    try {
      const { specialDateName, startDate, endDate, discountPercentage } = req.body;
      
      // Verificar datos obligatorios
      if (!specialDateName || !startDate || !endDate || !discountPercentage) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Todos los campos son obligatorios'
        });
      }
      
      // Crear cupón para fecha especial
      const specialDateCode = `${specialDateName.substring(0, 4).toUpperCase()}-${new Date().getFullYear()}`;
      const specialDateCoupon = await Coupon.create({
        code: specialDateCode,
        title: `Descuento especial: ${specialDateName}`,
        description: `Descuento especial por ${specialDateName}`,
        type: 'percentage',
        value: discountPercentage,
        minimumPurchase: 15,
        expirationDate: new Date(endDate),
        isActive: true,
        isOnetime: false,
        specialDatesDetails: [{
          name: specialDateName,
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        }]
      });
      
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Cupón para fecha especial creado correctamente',
        data: specialDateCoupon
      });
    } catch (error) {
      console.error('Error al generar cupón para fecha especial:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error al generar cupón para fecha especial',
        error: error.message
      });
    }
  }
}

module.exports = new CouponController();
