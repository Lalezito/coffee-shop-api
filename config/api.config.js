/**
 * Configuración de APIs externas
 */
module.exports = {
  // OneSignal (notificaciones push)
  oneSignal: {
    appId: process.env.ONESIGNAL_APP_ID,
    apiKey: process.env.ONESIGNAL_API_KEY,
    userAuthKey: process.env.ONESIGNAL_USER_AUTH_KEY,
    baseUrl: 'https://onesignal.com/api/v1'
  },
  
  // Stripe (pagos)
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    currency: 'USD',
    paymentMethods: ['card', 'apple_pay', 'google_pay']
  },
  
  // Clerk (autenticación)
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY,
    jwtKey: process.env.CLERK_JWT_KEY,
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
    baseUrl: 'https://api.clerk.dev/v1'
  },
  
  // Sentry (monitoreo de errores)
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0
  },
  
  // Configuración de correo electrónico
  email: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@coffeeshop.com'
  }
};
