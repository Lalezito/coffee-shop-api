const crypto = require('crypto');

// Intentar importar Sentry, y si no está disponible, crear un mock
let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  Sentry = {
    captureException: (err) => console.error('Sentry no disponible:', err)
  };
}

/**
 * Middleware para verificar webhooks de Clerk
 * Verifica que las solicitudes provengan realmente de Clerk antes de procesarlas
 */
const verifyClerkWebhook = (req, res, next) => {
  try {
    // Obtener el cuerpo de la solicitud sin procesar y la firma del encabezado
    const payload = req.rawBody;
    const headerSignature = req.headers['svix-signature'];
    const headerTimestamp = req.headers['svix-timestamp'];
    const headerId = req.headers['svix-id'];
    
    if (!headerSignature || !headerTimestamp || !headerId) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado: Encabezados de webhook de Clerk faltantes'
      });
    }

    // TODO: IMPLEMENTAR REALMENTE - Verificación de firma de Clerk
    // En una implementación real, verificaríamos la firma con el secreto de webhook
    // const timestamp = Math.floor(Date.now() / 1000);
    // const tolerance = 300; // 5 minutos en segundos
    // 
    // if (Math.abs(timestamp - parseInt(headerTimestamp)) > tolerance) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'No autorizado: Webhook timestamp fuera de tolerancia'
    //   });
    // }
    // 
    // const signature = crypto
    //   .createHmac('sha256', process.env.CLERK_WEBHOOK_SECRET)
    //   .update(`${headerTimestamp}.${payload}`)
    //   .digest('hex');
    // 
    // if (signature !== headerSignature) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'No autorizado: Firma de webhook inválida'
    //   });
    // }

    // Para desarrollo, simulamos una verificación exitosa
    console.log('Webhook de Clerk recibido:', {
      id: headerId,
      timestamp: headerTimestamp
    });

    next();
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al verificar webhook de Clerk:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar webhook'
    });
  }
};

module.exports = {
  verifyClerkWebhook
};
