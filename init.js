#!/usr/bin/env node

/**
 * Script de inicialización del servidor Coffee Shop API
 * Verifica la configuración y dependencias antes de iniciar el servidor
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Muestra un mensaje con formato en la consola
 */
function log(message, type = 'info') {
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    highlight: colors.cyan,
  };
  
  console.log(`${colorMap[type] || colors.blue}${message}${colors.reset}`);
}

/**
 * Verifica si un archivo existe
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Verifica las dependencias de Node
 */
function checkDependencies() {
  log('Verificando dependencias...', 'info');
  
  try {
    // Verificar si node_modules existe
    if (!fileExists(path.join(__dirname, 'node_modules'))) {
      log('El directorio "node_modules" no existe. Instalando dependencias...', 'warning');
      execSync('npm install', { stdio: 'inherit' });
    }
    
    log('Dependencias verificadas ✓', 'success');
    return true;
  } catch (error) {
    log(`Error al verificar dependencias: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Verifica la configuración de entorno
 */
function checkEnvironment() {
  log('Verificando configuración de entorno...', 'info');
  
  // Verificar si .env existe
  if (!fileExists(path.join(__dirname, '.env'))) {
    // Si no existe .env pero existe .env.example, crear .env a partir de .env.example
    if (fileExists(path.join(__dirname, '.env.example'))) {
      log('Archivo .env no encontrado. Creando a partir de .env.example...', 'warning');
      fs.copyFileSync(
        path.join(__dirname, '.env.example'),
        path.join(__dirname, '.env')
      );
      log('Archivo .env creado. Por favor, revise y actualice las variables de entorno.', 'warning');
    } else {
      log('No se encontró archivo .env ni .env.example. La aplicación podría no funcionar correctamente.', 'error');
      return false;
    }
  }
  
  // Verificar variables de entorno críticas
  const requiredEnvVars = [
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`Faltan las siguientes variables de entorno: ${missingVars.join(', ')}`, 'error');
    log('Por favor, añádalas al archivo .env', 'warning');
    return false;
  }
  
  log('Configuración de entorno verificada ✓', 'success');
  return true;
}

/**
 * Función principal
 */
function init() {
  log('=== Inicialización de Coffee Shop API ===', 'highlight');
  
  const depsOk = checkDependencies();
  const envOk = checkEnvironment();
  
  if (!depsOk || !envOk) {
    log('La inicialización falló. Por favor, corrija los errores antes de iniciar el servidor.', 'error');
    process.exit(1);
  }
  
  log('Inicialización completada. Iniciando servidor...', 'success');
  
  // Iniciar el servidor
  require('./server');
}

// Ejecutar inicialización
init();
