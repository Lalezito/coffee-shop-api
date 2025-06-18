const mongoose = require('mongoose');

// Establecer los parámetros de conexión
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coffee_shop';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB conectado correctamente');
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error.message);
    console.log('⚠️ Continuando sin base de datos (modo desarrollo)');
    // No salir con error - permitir que el servidor funcione sin BD para testing
    // En producción real, configurar MONGODB_URI adecuadamente
  }
};

module.exports = connectDB;
