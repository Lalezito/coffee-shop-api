require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware básico
app.use(express.json());
app.use(cors());

// Ruta de prueba
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'online',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    message: 'Backend funcionando correctamente'
  });
});

// Ruta de salud para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de prueba iniciado en puerto ${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; 