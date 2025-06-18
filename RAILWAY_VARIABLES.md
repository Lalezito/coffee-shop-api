# 🔧 Variables de Entorno para Railway

## Variables Requeridas para el Backend API

### 📊 **MongoDB**
```
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/coffee_shop?retryWrites=true&w=majority
```

### 💳 **Stripe**
```
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_de_stripe
STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica_de_stripe
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret
```

### 🔐 **Clerk**
```
CLERK_SECRET_KEY=sk_test_tu_clave_secreta_de_clerk
CLERK_PUBLISHABLE_KEY=pk_test_tu_clave_publica_de_clerk
CLERK_WEBHOOK_SECRET=whsec_tu_webhook_secret_de_clerk
```

### 🚀 **Configuración General**
```
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://tu-frontend-url.railway.app
CORS_ORIGIN=https://tu-frontend-url.railway.app
```

### 📱 **OneSignal**
```
ONESIGNAL_APP_ID=tu_app_id_de_onesignal
ONESIGNAL_REST_API_KEY=tu_rest_api_key_de_onesignal
```

### 📈 **Sentry**
```
SENTRY_DSN=https://tu_dsn_de_sentry@sentry.io/proyecto
```

## 🔗 **Cómo Configurar**

1. Ve a: https://railway.com/project/f3eb1fd3-da62-4622-a681-eba61c54bd27
2. Selecciona tu servicio
3. Ve a "Variables"
4. Añade cada variable de arriba con sus valores reales

## ⚠️ **Importante**
- Reemplaza todos los valores de ejemplo con tus claves reales
- NO subas este archivo con las claves reales a GitHub
- El backend necesita al menos MONGODB_URI y STRIPE_SECRET_KEY para funcionar 