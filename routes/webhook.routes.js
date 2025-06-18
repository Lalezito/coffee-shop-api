const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { verifyClerkWebhook } = require('../middleware/clerk.webhook.middleware');

// Configurar Express para recibir el cuerpo sin procesar para webhooks
// (necesario para verificar la firma)
router.use(express.raw({
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Ruta para webhooks de Clerk
router.post('/clerk', verifyClerkWebhook, webhookController.handleClerkWebhook);

module.exports = router;
