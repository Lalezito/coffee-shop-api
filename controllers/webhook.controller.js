const User = require('../models/user.model');
const ClerkService = require('../services/clerk.service');

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  // Si Sentry no está disponible, creamos un mock
  Sentry = {
    captureException: (err) => console.error('Sentry no disponible:', err)
  };
}

/**
 * Procesar eventos de webhook de Clerk
 */
exports.handleClerkWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log(`Webhook de Clerk recibido: ${type}`);

    // Manejar diferentes tipos de eventos
    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      
      // Otros eventos que podríamos querer manejar
      case 'session.created':
      case 'session.revoked':
      case 'email.created':
      case 'email.verified':
        // TODO: Implementar manejo de estos eventos si es necesario
        console.log(`Evento ${type} recibido pero no procesado`);
        break;

      default:
        console.log(`Evento de webhook no manejado: ${type}`);
    }

    res.status(200).json({ success: true, message: 'Webhook procesado correctamente' });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al procesar webhook de Clerk:', error);
    // Aún retornamos 200 para que Clerk no reintente, pero registramos el error
    res.status(200).json({ success: false, message: 'Error al procesar webhook' });
  }
};

/**
 * Manejar evento de usuario creado
 */
async function handleUserCreated(data) {
  try {
    const { id, email_addresses, first_name, last_name } = data;
    
    // Verificar si ya existe en nuestra base de datos
    const existingUser = await User.findOne({ userId: id });
    if (existingUser) {
      console.log(`Usuario ${id} ya existe en la base de datos`);
      return;
    }

    // Obtener el email principal
    const primaryEmail = email_addresses.find(email => email.primary)?.email_address;
    if (!primaryEmail) {
      console.warn(`Usuario ${id} creado sin email principal`);
      return;
    }

    // Crear usuario en nuestra base de datos
    const newUser = new User({
      userId: id,
      email: primaryEmail,
      role: 'user',
      preferences: {
        coffee: {
          intensity: 3,
          flavor: 'balanced',
          milk: true
        },
        notifications: {
          promotions: true,
          orders: true,
          newsletter: false
        }
      }
    });

    await newUser.save();
    console.log(`Usuario ${id} creado exitosamente en nuestra base de datos`);
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al manejar evento user.created:', error);
  }
}

/**
 * Manejar evento de usuario actualizado
 */
async function handleUserUpdated(data) {
  try {
    const { id, email_addresses, first_name, last_name } = data;
    
    // Buscar usuario en nuestra base de datos
    const user = await User.findOne({ userId: id });
    if (!user) {
      // Si no existe, lo creamos
      return await handleUserCreated(data);
    }

    // Actualizar email si cambió
    const primaryEmail = email_addresses.find(email => email.primary)?.email_address;
    if (primaryEmail && primaryEmail !== user.email) {
      user.email = primaryEmail;
      await user.save();
      console.log(`Email de usuario ${id} actualizado a ${primaryEmail}`);
    }

    // No actualizamos otros campos como preferencias desde aquí, ya que eso lo
    // maneja nuestra propia API directamente
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al manejar evento user.updated:', error);
  }
}

/**
 * Manejar evento de usuario eliminado
 */
async function handleUserDeleted(data) {
  try {
    const { id } = data;
    
    // Eliminar usuario de nuestra base de datos
    const result = await User.deleteOne({ userId: id });
    
    if (result.deletedCount > 0) {
      console.log(`Usuario ${id} eliminado exitosamente de nuestra base de datos`);
    } else {
      console.log(`Usuario ${id} no encontrado para eliminar`);
    }
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error al manejar evento user.deleted:', error);
  }
}
