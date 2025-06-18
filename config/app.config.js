/**
 * Configuración general de la aplicación
 */
module.exports = {
  // URL base del API
  apiUrl: process.env.API_URL || 'http://localhost:5000/api',
  
  // URL del cliente
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Configuración JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Configuración de CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['x-auth-token'],
  },
  
  // Configuración de rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 solicitudes por ventana
  },
  
  // Configuración de notificaciones
  notifications: {
    defaultTitle: 'Coffee Shop',
    defaultIcon: 'https://example.com/icon.png',
  },
  
  // Configuración de seguridad
  security: {
    bcryptSaltRounds: 10,
  },
  
  // Otras configuraciones
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  }
};
