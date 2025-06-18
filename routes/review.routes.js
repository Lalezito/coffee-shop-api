const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate } = require("../middleware/auth.middleware");

// Rutas públicas
router.get('/product/:productId', reviewController.getReviewsByProduct);
router.get('/product/:productId/rating', reviewController.getProductRating);

// Rutas protegidas (requieren autenticación)
router.get('/', authenticate, reviewController.getAllReviews);
router.get('/user/:userId', authenticate, reviewController.getReviewsByUser);
router.get('/order/:orderId', authenticate, reviewController.getReviewsByOrder);
router.post('/', authenticate, reviewController.createReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);

module.exports = router;
