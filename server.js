require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const connectDB = require('./config/db.config');

// Inicializar Sentry para monitoreo de errores (si está configurado)
let Sentry;
try {
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
  console.log('Sentry inicializado correctamente');
} catch (e) {
  console.log('Sentry no configurado o no disponible');
}

// Crear la aplicación Express
const app = express();

// Middleware para parsear JSON
app.use((req, res, next) => {
  // Verificar si la solicitud es para el webhook de Stripe
  if (req.originalUrl === '/api/payments/webhook' || req.originalUrl === '/api/payments/webhook/') {
    // Para webhooks, usamos el body raw para verificar firmas
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    // Para el resto, usamos el parser JSON estándar
    express.json({ limit: '5mb' })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Configurar CORS
app.use(cors());

// Seguridad HTTP con Helmet
app.use(helmet());

// Logging en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Conectar a la base de datos
connectDB();

// Ruta de estado del API
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'online',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Importar y usar rutas
const authRoutes = require('./routes/auth.routes');
const notificationRoutes = require('./routes/notification.routes');
const userNotificationsRoutes = require('./routes/user_notifications.routes');
const paymentRoutes = require('./routes/payment.routes');
const reviewRoutes = require('./routes/review.routes');
const orderRoutes = require('./routes/order.routes');
const storeRoutes = require('./routes/store.routes');
const couponRoutes = require('./routes/coupon.routes');
const allergenRoutes = require('./routes/allergen.routes');
const flavorProfileRoutes = require('./routes/flavor_profile.routes');
const userProfileRoutes = require('./routes/userProfile.routes');
const cartRoutes = require('./routes/cartRoutes');
const experimentRoutes = require('./routes/experiment.routes');
const segmentRoutes = require('./routes/segment.routes');
const webhookRoutes = require('./routes/webhook.routes');
const adminRoutes = require('./routes/admin.routes');
const promotionRoutes = require('./routes/promotion.routes');

// Definir rutas base
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users/preferences/notifications', userNotificationsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/allergens', allergenRoutes);
app.use('/api/flavor-profiles', flavorProfileRoutes);
app.use('/api/user-profiles', userProfileRoutes);
app.use('/api/users', userProfileRoutes); // Alias para compatibilidad con Flutter
app.use('/api/cart', cartRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/promotions', promotionRoutes);

// Middleware para manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.path
  });
});

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  if (Sentry) {
    Sentry.captureException(err);
  }
  
  console.error('Error del servidor:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API corriendo en: http://localhost:${PORT}/api`);
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('Servidor detenido por SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Servidor detenido por SIGTERM');
  process.exit(0);
});

// Para testing
module.exports = app;
