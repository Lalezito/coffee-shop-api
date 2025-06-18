# Coffee Shop API

API Backend para la aplicación Coffee Shop que permite gestionar usuarios, órdenes, pagos, notificaciones, reseñas y más.

## Estructura del Proyecto

```
coffee-shop-api/
├── config/              # Configuración de la aplicación
├── controllers/         # Controladores para manejar la lógica de negocio
├── middleware/          # Middleware para autenticación y validación
├── models/              # Modelos de datos Mongoose
├── routes/              # Rutas de la API
├── services/            # Servicios externos (Stripe, OneSignal, etc.)
├── validators/          # Validadores de datos para rutas
├── .env                 # Variables de entorno (no incluido en el repositorio)
├── .env.example         # Ejemplo de variables de entorno
├── .gitignore           # Archivos a ignorar por Git
├── package.json         # Dependencias y scripts
└── server.js            # Punto de entrada de la aplicación
```

## Requisitos

- Node.js (>=16.0.0)
- MongoDB
- npm o yarn

## Instalación

1. Clona el repositorio
2. Instala las dependencias:

```bash
npm install
```

3. Crea un archivo `.env` basado en `.env.example` y configura tus variables

## Ejecutar el Servidor

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm start
```

## Endpoints Principales

La API está organizada en los siguientes grupos de endpoints:

- `/api/auth` - Autenticación y gestión de usuarios
- `/api/notifications` - Gestión de notificaciones push
- `/api/payments` - Procesamiento de pagos y métodos de pago
- `/api/reviews` - Sistema de reseñas de productos
- `/api/orders` - Gestión de órdenes y pedidos
- `/api/stores` - Información de tiendas y ubicaciones
- `/api/coupons` - Cupones y promociones
- `/api/allergens` - Información de alérgenos
- `/api/flavor-profiles` - Perfiles de sabor para usuarios
- `/api/user-profiles` - Perfiles y preferencias de usuario
- `/api/experiments` - Sistema A/B testing
- `/api/segments` - Segmentación de usuarios
- `/api/webhooks` - Endpoints para webhooks externos
- `/api/admin` - Panel de administración

## Características Principales

- Autenticación JWT y con Clerk
- Integración con Stripe para pagos
- Notificaciones push con OneSignal
- Sistema de reseñas asociadas a pedidos
- Sistema de cupones y descuentos
- Segmentación de usuarios y personalización
- Experimentación A/B
- Monitoreo de errores con Sentry
