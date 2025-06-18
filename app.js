const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas básicas
app.get('/', (req, res) => {
  res.json({ message: 'Coffee Shop API funcionando!' });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    message: '✅ Backend funcionando correctamente'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor funcionando en puerto ${PORT}`);
});

module.exports = app; 