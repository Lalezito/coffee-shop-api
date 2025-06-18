const Store = require('../models/store.model');
const mongoose = require('mongoose');
const Sentry = require('@sentry/node');

/**
 * Controlador para la gestión de tiendas
 */
class StoreController {
  /**
   * Obtener todas las tiendas
   */
  async getAllStores(req, res) {
    try {
      const stores = await Store.find({});
      return res.status(200).json({ success: true, data: stores });
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al obtener tiendas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener tiendas',
        error: error.message
      });
    }
  }

  /**
   * Obtener una tienda por su ID
   */
  async getStoreById(req, res) {
    try {
      const { storeId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tienda inválido'
        });
      }

      const store = await Store.findById(storeId);
      
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Tienda no encontrada'
        });
      }

      return res.status(200).json({ success: true, data: store });
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al obtener tienda ${req.params.storeId}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la tienda',
        error: error.message
      });
    }
  }

  /**
   * Crear una nueva tienda
   */
  async createStore(req, res) {
    try {
      const { name, address, imageUrl } = req.body;
      
      // Validaciones básicas
      if (!name || !address) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren nombre y dirección'
        });
      }

      const store = new Store({
        name,
        address,
        imageUrl,
        assignedUserIds: []
      });

      const savedStore = await store.save();
      
      return res.status(201).json({
        success: true,
        message: 'Tienda creada correctamente',
        data: savedStore
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error al crear tienda:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear la tienda',
        error: error.message
      });
    }
  }

  /**
   * Actualizar una tienda existente
   */
  async updateStore(req, res) {
    try {
      const { storeId } = req.params;
      const { name, address, imageUrl } = req.body;

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tienda inválido'
        });
      }

      // Verificar que la tienda exista
      const existingStore = await Store.findById(storeId);
      if (!existingStore) {
        return res.status(404).json({
          success: false,
          message: 'Tienda no encontrada'
        });
      }

      // Actualizar sólo los campos proporcionados
      const updateData = {};
      if (name) updateData.name = name;
      if (address) updateData.address = address;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

      const updatedStore = await Store.findByIdAndUpdate(
        storeId,
        { $set: updateData },
        { new: true } // Retornar el documento actualizado
      );

      return res.status(200).json({
        success: true,
        message: 'Tienda actualizada correctamente',
        data: updatedStore
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al actualizar tienda ${req.params.storeId}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar la tienda',
        error: error.message
      });
    }
  }

  /**
   * Eliminar una tienda
   */
  async deleteStore(req, res) {
    try {
      const { storeId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tienda inválido'
        });
      }
      
      // Verificar que la tienda exista
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Tienda no encontrada'
        });
      }

      await Store.findByIdAndDelete(storeId);
      
      return res.status(200).json({
        success: true,
        message: 'Tienda eliminada correctamente'
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al eliminar tienda ${req.params.storeId}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar la tienda',
        error: error.message
      });
    }
  }

  /**
   * Asignar un usuario a una tienda
   */
  async assignUserToStore(req, res) {
    try {
      const { storeId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de usuario'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tienda inválido'
        });
      }

      // Verificar que la tienda exista
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Tienda no encontrada'
        });
      }

      // Verificar si el usuario ya está asignado a la tienda
      if (store.assignedUserIds.includes(userId)) {
        return res.status(200).json({
          success: true,
          message: 'El usuario ya está asignado a esta tienda',
          data: store
        });
      }

      // Añadir el usuario a la tienda
      const updatedStore = await Store.findByIdAndUpdate(
        storeId,
        { $push: { assignedUserIds: userId } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Usuario asignado correctamente a la tienda',
        data: updatedStore
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al asignar usuario a tienda ${req.params.storeId}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error al asignar usuario a la tienda',
        error: error.message
      });
    }
  }

  /**
   * Desasignar un usuario de una tienda
   */
  async unassignUserFromStore(req, res) {
    try {
      const { storeId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de usuario'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de tienda inválido'
        });
      }

      // Verificar que la tienda exista
      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Tienda no encontrada'
        });
      }

      // Verificar si el usuario está asignado a la tienda
      if (!store.assignedUserIds.includes(userId)) {
        return res.status(200).json({
          success: true,
          message: 'El usuario no está asignado a esta tienda',
          data: store
        });
      }

      // Quitar el usuario de la tienda
      const updatedStore = await Store.findByIdAndUpdate(
        storeId,
        { $pull: { assignedUserIds: userId } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Usuario desasignado correctamente de la tienda',
        data: updatedStore
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al desasignar usuario de tienda ${req.params.storeId}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error al desasignar usuario de la tienda',
        error: error.message
      });
    }
  }

  /**
   * Obtener las tiendas asignadas a un usuario
   */
  async getStoresByUserId(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere ID de usuario'
        });
      }

      const stores = await Store.find({ assignedUserIds: userId });
      
      return res.status(200).json({
        success: true,
        data: stores
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error al obtener tiendas para el usuario ${req.params.userId}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener las tiendas del usuario',
        error: error.message
      });
    }
  }
}

module.exports = new StoreController();
