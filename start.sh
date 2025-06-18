#!/bin/bash

# Script de inicio para Railway
echo "🚀 Iniciando Coffee Shop API en Railway..."

# Configurar variables de entorno para Railway
export NODE_ENV=production
export PORT=${PORT:-3000}

# Mostrar información de debug
echo "📊 Variables de entorno:"
echo "  - NODE_ENV: $NODE_ENV"
echo "  - PORT: $PORT"
echo "  - MONGODB_URI: ${MONGODB_URI:0:20}..."

# Verificar que Node.js esté disponible
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    exit 1
fi

echo "✅ Node.js versión: $(node --version)"
echo "✅ NPM versión: $(npm --version)"

# Verificar que el archivo server.js existe
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js no encontrado"
    exit 1
fi

echo "✅ Archivo server.js encontrado"

# Iniciar el servidor
echo "🎯 Iniciando servidor en puerto $PORT..."
exec node server.js 