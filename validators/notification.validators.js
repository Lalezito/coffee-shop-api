const { body, validationResult } = require('express-validator');

// Validation middleware for registering a device
exports.validateRegisterDevice = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('playerId').notEmpty().withMessage('playerId is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation errors',
        errors: errors.array() 
      });
    }
    next();
  }
];

// Validation middleware for sending notification to a user
exports.validateSendToUser = [
  body('userId').notEmpty().withMessage('userId is required'),
  body('title').notEmpty().withMessage('title is required'),
  body('content').notEmpty().withMessage('content is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation errors',
        errors: errors.array() 
      });
    }
    next();
  }
];

// Validation middleware for sending order status notification
exports.validateSendOrderStatus = [
  body('orderId').notEmpty().withMessage('orderId is required'),
  body('newStatus').notEmpty().withMessage('newStatus is required'),
  body('userIds').isArray().withMessage('userIds must be an array'),
  body('userIds.*').notEmpty().withMessage('Each userId must not be empty'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation errors',
        errors: errors.array() 
      });
    }
    next();
  }
];

// Validation middleware for sending global notification
exports.validateSendGlobal = [
  body('title').notEmpty().withMessage('title is required'),
  body('content').notEmpty().withMessage('content is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation errors',
        errors: errors.array() 
      });
    }
    next();
  }
];
