const axios = require('axios');
const jwt = require('jsonwebtoken');

let Sentry;
try {
  Sentry = require('@sentry/node');
} catch (e) {
  // Si Sentry no está disponible, creamos un mock
  Sentry = {
    captureException: (err) => console.error('Sentry no disponible:', err)
  };
}

class ClerkService {
  constructor() {
    this.apiKey = process.env.CLERK_API_KEY;
    this.jwtKey = process.env.JWT_SECRET;
    this.baseUrl = 'https://api.clerk.dev/v1';
  }

  /**
   * Configurar cliente HTTP para Clerk
   * @returns {Object} - Cliente axios configurado
   */
  getClient() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Verificar un token de sesión de Clerk
   * @param {string} sessionToken - Token de sesión a verificar
   * @returns {Promise<Object>} - Datos del usuario
   */
  async verifySessionToken(sessionToken) {
    try {
      // Integración real con la API de autenticación de Clerk
      const client = this.getClient();
      const response = await client.post('/sessions/verify', {
        token: sessionToken
      });

      if (response.status !== 200 || !response.data.verified) {
        throw new Error('Sesión inválida');
      }

      const userData = await this.getUserById(response.data.userId);
      return {
        success: true,
        userId: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
        role: userData.metadata?.role || 'user'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al verificar sesión:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crear un token JWT para un usuario autenticado
   * @param {Object} userData - Datos del usuario
   * @returns {Object} - Token JWT generado
   */
  generateJWT(userData) {
    try {
      const payload = {
        sub: userData.userId,
        email: userData.email,
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        role: userData.role || 'user'
      };

      const token = jwt.sign(
        payload,
        this.jwtKey,
        { expiresIn: '24h' }
      );

      return {
        success: true,
        token
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al generar JWT:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener usuario por ID
   * @param {string} userId - ID del usuario en Clerk
   * @returns {Promise<Object>} - Datos del usuario
   */
  async getUserById(userId) {
    try {
      // Integración real con API de autenticación de Clerk
      const client = this.getClient();
      const response = await client.get(`/users/${userId}`);

      if (response.status !== 200) {
        throw new Error('Error al obtener usuario');
      }

      return {
        id: response.data.id,
        email: response.data.email_addresses[0]?.email_address,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        imageUrl: response.data.profile_image_url,
        metadata: response.data.metadata
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar metadatos de usuario
   * @param {string} userId - ID del usuario
   * @param {Object} metadata - Metadatos a actualizar
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async updateUserMetadata(userId, metadata) {
    try {
      // Integración real con API de autenticación de Clerk
      const client = this.getClient();
      const response = await client.patch(`/users/${userId}/metadata`, {
        metadata
      });

      if (response.status !== 200) {
        throw new Error('Error al actualizar metadatos');
      }

      return {
        success: true,
        message: 'Metadatos actualizados correctamente'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al actualizar metadatos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crear un nuevo usuario (para uso administrativo)
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} - Usuario creado
   */
  async createUser(userData) {
    try {
      // Integración real con API de autenticación de Clerk
      const { email, password, firstName, lastName } = userData;
      
      const client = this.getClient();
      const response = await client.post('/users', {
        email_addresses: [{ email_address: email }],
        password,
        first_name: firstName,
        last_name: lastName
      });

      if (response.status !== 201) {
        throw new Error('Error al crear usuario');
      }

      return {
        success: true,
        userId: response.data.id,
        message: 'Usuario creado correctamente'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al crear usuario:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar la contraseña actual de un usuario
   * @param {string} userId - ID del usuario
   * @param {string} password - Contraseña a verificar
   * @returns {Promise<Object>} - Resultado de la verificación
   */
  async verifyPassword(userId, password) {
    try {
      const client = this.getClient();
      const response = await client.post(`/users/${userId}/verify_password`, {
        password
      });

      return {
        success: response.data.verified === true,
        message: response.data.verified ? 'Contraseña válida' : 'Contraseña incorrecta'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al verificar contraseña:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Cambiar la contraseña de un usuario
   * @param {string} userId - ID del usuario
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<Object>} - Resultado del cambio
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Primero verificamos la contraseña actual
      const verifyResult = await this.verifyPassword(userId, currentPassword);
      
      if (!verifyResult.success) {
        return {
          success: false,
          message: 'La contraseña actual es incorrecta'
        };
      }

      // Si la verificación fue exitosa, actualizamos la contraseña
      const client = this.getClient();
      const response = await client.patch(`/users/${userId}/update_password`, {
        current_password: currentPassword,
        password: newPassword
      });

      if (response.status !== 200) {
        throw new Error('Error al actualizar contraseña');
      }

      return {
        success: true,
        message: 'Contraseña actualizada correctamente'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al cambiar contraseña:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Eliminar una cuenta de usuario
   * @param {string} userId - ID del usuario a eliminar
   * @returns {Promise<Object>} - Resultado de la eliminación
   */
  async deleteUser(userId) {
    try {
      const client = this.getClient();
      const response = await client.delete(`/users/${userId}`);

      if (response.status !== 200) {
        throw new Error('Error al eliminar usuario');
      }

      return {
        success: true,
        message: 'Usuario eliminado correctamente'
      };
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al eliminar usuario:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

module.exports = new ClerkService();
