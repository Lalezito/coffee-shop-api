const Notification = require('../models/notification.model');
const NotificationTemplate = require('../models/notificationTemplate.model');
const OneSignalService = require('./onesignal.service'); // Assuming this is for sending
// const User = require('../models/user.model'); // May be needed for recipient lookups
// const SegmentationService = require('./segmentation.service'); // May be needed for segment-based sending

// TODO: IMPLEMENTAR REALMENTE - Error handling, logging (Sentry, etc.)

class NotificationService {

  // --- Template Management ---
  async createNotificationTemplate(templateData) {
    // TODO: IMPLEMENTAR REALMENTE - Logic to create a new notification template
    const template = new NotificationTemplate(templateData);
    await template.save();
    return template;
  }

  async getNotificationTemplateById(templateId) {
    // TODO: IMPLEMENTAR REALMENTE - Logic to get a template by its ID
    return NotificationTemplate.findById(templateId);
  }

  async getAllNotificationTemplates(filterOptions = {}) {
    // TODO: IMPLEMENTAR REALMENTE - Logic to get all templates, possibly with filtering
    return NotificationTemplate.find(filterOptions).sort({ createdAt: -1 });
  }

  async updateNotificationTemplate(templateId, updateData) {
    // TODO: IMPLEMENTAR REALMENTE - Logic to update a template
    return NotificationTemplate.findByIdAndUpdate(templateId, updateData, { new: true });
  }

  async deleteNotificationTemplate(templateId) {
    // TODO: IMPLEMENTAR REALMENTE - Logic to delete a template
    return NotificationTemplate.findByIdAndDelete(templateId);
  }

  // --- Scheduled Notifications ---
  async scheduleNotification(notificationData, scheduleOptions) {
    // TODO: IMPLEMENTAR REALMENTE - Logic to schedule a notification
    // This will likely involve:
    // 1. Storing the notification with a 'scheduled' status and 'scheduledAt' time.
    // 2. Setting up a cron job or a queue system to process these at the scheduled time.
    console.log('NotificationService: scheduleNotification called with', notificationData, scheduleOptions);
    const scheduledNotification = new Notification({
      ...notificationData,
      status: 'scheduled', // You'll need to add this field to notification.model.js
      scheduledAt: scheduleOptions.sendAt, // You'll need to add this field
      // sentBy: usually from req.user.userId
    });
    await scheduledNotification.save();
    return scheduledNotification;
  }

  async getScheduledNotifications(filterOptions = {}) {
    // TODO: IMPLEMENTAR REALMENTE - Logic to retrieve notifications with status 'scheduled'
    const query = { ...filterOptions, status: 'scheduled' }; // Assuming 'status' field
    return Notification.find(query).sort({ scheduledAt: 1 });
  }

  async cancelScheduledNotification(notificationId) {
    // TODO: IMPLEMENTAR REALMENTE - Logic to cancel a scheduled notification
    // This might mean updating its status to 'cancelled' or removing it.
    const notification = await Notification.findById(notificationId);
    if (notification && notification.status === 'scheduled') {
      notification.status = 'cancelled'; // Assuming 'status' field
      // notification.cancelledAt = new Date(); // Optional: track cancellation time
      await notification.save();
      return notification;
    }
    return null; // Or throw an error if not found or not cancellable
  }

  // --- Sending Notifications ---
  async sendNotificationNow(notificationDetails) {
    // TODO: IMPLEMENTAR REALMENTE - Logic to send a notification immediately.
    // This could involve:
    // - Taking recipient IDs, segment names, or player IDs.
    // - Using a template or raw content.
    // - Calling OneSignalService or other sending mechanisms.
    console.log('NotificationService: sendNotificationNow called with', notificationDetails);
    // Example using OneSignalService if playerIds are provided:
    if (notificationDetails.playerIds && notificationDetails.playerIds.length > 0) {
      const sentNotification = await OneSignalService.sendToPlayerIds(
        notificationDetails.playerIds,
        notificationDetails.title,
        notificationDetails.content,
        notificationDetails.additionalData
      );
      // Log the sent notification
      const notificationLog = new Notification({
         ...notificationDetails, // title, content, additionalData
         recipients: notificationDetails.playerIds, // Or map to user IDs if available
         isGlobal: false,
         sentBy: notificationDetails.sentBy || 'system',
         status: 'sent', // Assuming 'status' field
         sentAt: new Date(), // Assuming 'sentAt' field
         responseStatus: sentNotification.statusCode, // Example, adapt to OneSignal's response
         responseData: sentNotification.body
      });
      await notificationLog.save();
      return notificationLog;
    }
    // Fallback or other sending logic
    throw new Error('Recipient information not provided or type not supported for sendNotificationNow');
  }

  async processTemplate(templateId, variables) {
    const template = await this.getNotificationTemplateById(templateId);
    if (!template || !template.body) {
        throw new Error(`Template with ID ${templateId} not found or has an empty body.`);
    }
    
    let processedBody = template.body;
    let processedSubject = template.subject || '';

    for (const key in variables) {
        if (Object.prototype.hasOwnProperty.call(variables, key)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            processedBody = processedBody.replace(regex, variables[key]);
            processedSubject = processedSubject.replace(regex, variables[key]);
        }
    }
    return { title: processedSubject, body: processedBody, type: template.type, originalTemplate: template };
  }
}

module.exports = new NotificationService();
