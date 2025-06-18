# Sistema de Notificaciones para Coffee Shop App

Este documento describe la implementación del sistema de notificaciones push utilizando OneSignal con un backend Node.js/Express.

## Estructura del Backend

```
coffee_shop_api/
├── src/
│   ├── controllers/
│   │   ├── admin.controller.js    # Controlador para funciones de administrador
│   │   ├── auth.controller.js     # Controlador para autenticación
│   │   └── notification.controller.js # Controlador para notificaciones
│   ├── middleware/
│   │   └── auth.middleware.js     # Middleware de autenticación
│   ├── models/
│   │   ├── notification.model.js  # Modelo para notificaciones
│   │   └── user.model.js          # Modelo para usuarios
│   ├── routes/
│   │   ├── admin.routes.js        # Rutas para administradores
│   │   ├── auth.routes.js         # Rutas para autenticación
│   │   └── notification.routes.js # Rutas para notificaciones
│   ├── services/
│   │   └── onesignal.service.js   # Servicio para interactuar con OneSignal
│   ├── validators/
│   │   └── notification.validators.js # Validadores para solicitudes
│   └── server.js                  # Punto de entrada del servidor
├── .env                           # Variables de entorno
└── package.json                   # Dependencias y scripts
```

## Endpoints API

### Notificaciones

- `POST /api/notifications/register-device` - Registrar un dispositivo
  - Cuerpo: `{ userId, playerId, email }`
  - Respuesta: `{ success, message }`

- `POST /api/notifications/send-to-user` - Enviar notificación a un usuario
  - Cuerpo: `{ userId, title, content, additionalData }`
  - Respuesta: `{ success, message, data }`

- `POST /api/notifications/send-order-status` - Notificar cambio de estado de orden
  - Cuerpo: `{ orderId, newStatus, userIds }`
  - Respuesta: `{ success, message, data }`

### Admin

- `POST /api/admin/notifications/send-global` - Enviar notificación global
  - Cuerpo: `{ title, content, additionalData }`
  - Respuesta: `{ success, message, data }`

- `GET /api/admin/notifications/history` - Ver historial de notificaciones
  - Query: `page, limit`
  - Respuesta: `{ success, data: { notifications, pagination } }`

### Autenticación

- `POST /api/auth/register` - Registrar usuario
  - Cuerpo: `{ userId, email, role }`
  - Respuesta: `{ success, message, data: { user, token } }`

- `POST /api/auth/login` - Iniciar sesión
  - Cuerpo: `{ userId, email }`
  - Respuesta: `{ success, message, data: { user, token } }`

- `GET /api/auth/me` - Obtener información del usuario actual
  - Headers: `Authorization: Bearer <token>`
  - Respuesta: `{ success, data: { user } }`

## Configuración en Flutter

1. Actualiza `OneSignalService.dart` para usar los nuevos endpoints
2. Crea una pantalla de administración para enviar notificaciones globales
3. Utiliza `ApiConfig.dart` para gestionar las URLs del backend

## Despliegue en Railway

1. Inicializa un repositorio Git para el proyecto
2. Conecta el repositorio a Railway
3. Configura las variables de entorno en Railway
4. Despliega el backend

## Variables de Entorno Requeridas

- `PORT` - Puerto del servidor
- `MONGODB_URI` - URI de conexión a MongoDB
- `ONESIGNAL_APP_ID` - ID de la app en OneSignal
- `ONESIGNAL_REST_API_KEY` - Clave REST API de OneSignal
- `JWT_SECRET` - Clave secreta para firmar JWT
- `JWT_EXPIRES_IN` - Tiempo de expiración de JWT
- `ALLOWED_ORIGINS` - Orígenes permitidos para CORS
