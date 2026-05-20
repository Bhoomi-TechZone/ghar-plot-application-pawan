/**
 * ReminderNotificationService.js
 * Production-ready notification service for Reminder System
 * Handles scheduled notifications when app is in background or closed
 */
import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
  AndroidCategory,
  AndroidStyle,
  AndroidVisibility,
  AndroidColor
} from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification channel configuration
const REMINDER_CHANNEL_ID = 'enquiry_reminders';
const REMINDER_CHANNEL_NAME = 'Enquiry Reminders';
const REMINDER_CHANNEL_DESCRIPTION = 'Notifications for client enquiry reminders';

class ReminderNotificationService {
  /**
   * Initialize the notification service
   * Creates notification channels and requests permissions
   */
  static async initialize() {
    try {
      // Request notification permissions
      await this.requestNotificationPermissions();

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }

      console.log('✅ ReminderNotificationService initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize ReminderNotificationService:', error);
      return false;
    }
  }

  /**
   * Request notification permissions for Android 13+
   */
  static async requestNotificationPermissions() {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        // Android 13+ requires explicit permission request
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (permission === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ Notification permission granted');
        } else {
          console.log('❌ Notification permission denied');
          throw new Error('Notification permission required for reminders');
        }
      }

      // 🔥 Request exact alarm permission for Android 12+ (CRITICAL for background notifications)
      if (Platform.Version >= 31) {
        try {
          // Check if canScheduleExactAlarms function is available
          if (typeof notifee.canScheduleExactAlarms === 'function') {
            const canScheduleExactAlarms = await notifee.canScheduleExactAlarms();
            console.log('🔔 Can schedule exact alarms:', canScheduleExactAlarms);

            if (!canScheduleExactAlarms) {
              if (typeof notifee.requestExactAlarmsPermission === 'function') {
                console.log('📱 Requesting exact alarm permission...');
                await notifee.requestExactAlarmsPermission();

                // Verify permission was granted
                const recheckPermission = await notifee.canScheduleExactAlarms();
                if (recheckPermission) {
                  console.log('✅ Exact alarm permission granted');
                } else {
                  console.warn('⚠️ User did not grant exact alarm permission');
                }
              }
            }
          } else {
            console.warn('⚠️ canScheduleExactAlarms not available in this notifee version');
          }
        } catch (error) {
          console.warn('⚠️ Failed to check exact alarm permissions:', error);
        }
      }

      // 🔥 Check battery optimization status (don't open settings automatically)
      await this.checkBatteryOptimization();
    }
  }

  /**
   * Check battery optimization status
   * Just checks and logs - doesn't open settings automatically
   */
  static async checkBatteryOptimization() {
    try {
      const powerManager = await notifee.getPowerManagerInfo();

      if (powerManager.activity) {
        console.log('⚠️ Battery optimization is enabled for this app');
        console.log('💡 Tip: For reliable background notifications, disable battery optimization');
        console.log('📱 To disable: Settings > Apps > Gharplot > Battery > Unrestricted');
        return false; // Battery optimization is ON
      } else {
        console.log('✅ Battery optimization already disabled or not applicable');
        return true; // Battery optimization is OFF or N/A
      }
    } catch (error) {
      console.warn('⚠️ Failed to check battery optimization:', error);
      return null; // Unknown status
    }
  }

  /**
   * Manually open battery optimization settings
   * Call this when user explicitly wants to change settings
   */
  static async openBatterySettings() {
    try {
      const powerManager = await notifee.getPowerManagerInfo();
      if (powerManager.activity) {
        await notifee.openBatteryOptimizationSettings();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to open battery settings:', error);
      return false;
    }
  }

  /**
   * Create notification channel with enhanced UI settings
   */
  static async createNotificationChannel() {
    try {
      const channelConfig = {
        id: REMINDER_CHANNEL_ID,
        name: REMINDER_CHANNEL_NAME,
        description: REMINDER_CHANNEL_DESCRIPTION,
        importance: AndroidImportance.HIGH, // High importance for sound and vibration
        sound: 'default', // Use default notification sound
        vibration: true,
        vibrationPattern: [300, 500, 300, 500],
        lights: true,
        lightColor: AndroidColor.BLUE,
        badge: true, // Show notification badge
        visibility: AndroidVisibility.PUBLIC,
        bypassDnd: false,
      };

      await notifee.createChannel(channelConfig);

      console.log('✅ Notification channel created successfully');
    } catch (error) {
      console.error('❌ Failed to create notification channel:', error);
      throw error;
    }
  }

  /**
   * Schedule a reminder notification
   * @param {Object} reminderData - Reminder information
   * @param {string} reminderData.id - Unique reminder ID
   * @param {string} reminderData.clientName - Client name
   * @param {string} reminderData.message - Reminder message
   * @param {Date|string} reminderData.scheduledDate - When to trigger notification
   * @param {string} reminderData.enquiryId - Associated enquiry ID
   * @param {Object} reminderData.enquiry - Full enquiry object (optional)
   */
  static async scheduleReminder(reminderData) {
    try {
      const {
        id,
        clientName,
        message,
        scheduledDate,
        enquiryId,
        enquiry = null
      } = reminderData;

      // Validate required fields
      if (!id || !clientName || !message || !scheduledDate) {
        throw new Error('Missing required reminder fields');
      }

      console.log('⏭️ [DISABLED] Skipping local frontend reminder scheduling as requested.');
      return { success: true, id: id };
      // 🔥 Use exact timing to minimize delays
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: notificationDate.getTime(),
        alarmManager: {
          allowWhileIdle: true, // Critical for background notifications
          exact: true, // Use exact alarm for precise timing
        },
      };

      // Prepare notification body with enhanced UI
      const timeString = notificationDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const dateString = notificationDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const notificationBody = {
        id: id,
        title: `📌 ${clientName}`,
        body: message,
        subtitle: `⏰ Scheduled for ${timeString}`,
        android: {
          channelId: REMINDER_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.REMINDER,
          sound: 'default',
          vibrationPattern: [300, 500, 300, 500],
          lights: [AndroidColor.BLUE, 300, 600],
          color: '#2196F3',
          showTimestamp: true,
          timestamp: notificationDate.getTime(),
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: `📋 ${message}\n\n📅 ${dateString} at ${timeString}\n👤 Client: ${clientName}`,
            title: `Reminder - ${clientName}`,
          },
        },
        data: {
          type: 'reminder',
          reminderId: id,
          clientName: clientName,
          message: message,
          enquiryId: enquiryId,
          clientName: clientName,
          scheduledDate: scheduledDate,
          enquiry: enquiry ? JSON.stringify(enquiry) : null,
          timestamp: Date.now(),
          // Pass additional navigation data for Enquiries screen
          navigationData: JSON.stringify({
            scrollToEnquiry: enquiryId,
            showDetails: true,
            fromNotification: true,
            isReminderNotification: true,
            highlightEnquiry: enquiryId
          })
        },
      };

      // Schedule the notification
      await notifee.createTriggerNotification(notificationBody, trigger);

      // Store reminder locally for reference
      await this.storeReminderLocally({
        id,
        clientName,
        message,
        scheduledDate: notificationDate.toISOString(),
        enquiryId,
        notificationId: id,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      });

      console.log(`✅ Reminder scheduled for ${clientName} at ${notificationDate.toLocaleString()}`);
      return {
        success: true,
        notificationId: id,
        scheduledFor: notificationDate.toISOString(),
        message: `Reminder set for ${notificationDate.toLocaleString()}`,
      };

    } catch (error) {
      console.error('❌ Failed to schedule reminder:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to schedule reminder. Please try again.',
      };
    }
  }

  /**
   * Cancel a scheduled reminder
   * @param {string} reminderId - Reminder ID to cancel
   */
  static async cancelReminder(reminderId) {
    try {
      // Cancel the scheduled notification
      await notifee.cancelNotification(reminderId);

      // Remove from local storage
      await this.removeReminderLocally(reminderId);

      console.log(`✅ Reminder ${reminderId} cancelled successfully`);
      return {
        success: true,
        message: 'Reminder cancelled successfully',
      };
    } catch (error) {
      console.error('❌ Failed to cancel reminder:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to cancel reminder',
      };
    }
  }

  /**
   * Update an existing reminder
   * @param {string} reminderId - Existing reminder ID
   * @param {Object} newReminderData - New reminder data
   */
  static async updateReminder(reminderId, newReminderData) {
    try {
      // Cancel existing reminder
      await this.cancelReminder(reminderId);

      // Schedule new reminder with updated data
      return await this.scheduleReminder({
        ...newReminderData,
        id: reminderId, // Keep same ID
      });
    } catch (error) {
      console.error('❌ Failed to update reminder:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update reminder',
      };
    }
  }

  /**
   * Get all scheduled reminders
   */
  static async getScheduledReminders() {
    try {
      const reminders = await AsyncStorage.getItem('scheduledReminders');
      return reminders ? JSON.parse(reminders) : [];
    } catch (error) {
      console.error('❌ Failed to get scheduled reminders:', error);
      return [];
    }
  }

  /**
   * Store reminder locally for reference
   * @private
   */
  static async storeReminderLocally(reminderData) {
    try {
      const existingReminders = await this.getScheduledReminders();
      const updatedReminders = [
        ...existingReminders.filter(r => r.id !== reminderData.id),
        reminderData
      ];

      await AsyncStorage.setItem('scheduledReminders', JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('❌ Failed to store reminder locally:', error);
    }
  }

  /**
   * Remove reminder from local storage
   * @private
   */
  static async removeReminderLocally(reminderId) {
    try {
      const existingReminders = await this.getScheduledReminders();
      const updatedReminders = existingReminders.filter(r => r.id !== reminderId);

      await AsyncStorage.setItem('scheduledReminders', JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('❌ Failed to remove reminder locally:', error);
    }
  }

  /**
   * Handle notification press events
   * @param {Object} notificationData - Notification data
   * @param {Function} onEnquirySelect - Callback for enquiry selection
   */
  static handleNotificationPress(notificationData, onEnquirySelect) {
    try {
      if (notificationData?.data?.type === 'enquiry_reminder') {
        const { enquiryId, enquiry } = notificationData.data;

        if (onEnquirySelect && enquiryId) {
          const enquiryData = enquiry ? JSON.parse(enquiry) : { _id: enquiryId };
          onEnquirySelect(enquiryData);
        }
      }
    } catch (error) {
      console.error('❌ Failed to handle notification press:', error);
    }
  }

  /**
   * Clean up expired reminders (older than 24 hours)
   */
  static async cleanupExpiredReminders() {
    try {
      const reminders = await this.getScheduledReminders();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

      const activeReminders = reminders.filter(reminder => {
        const scheduledDate = new Date(reminder.scheduledDate);
        return scheduledDate > oneDayAgo;
      });

      await AsyncStorage.setItem('scheduledReminders', JSON.stringify(activeReminders));
      console.log(`✅ Cleaned up ${reminders.length - activeReminders.length} expired reminders`);
    } catch (error) {
      console.error('❌ Failed to cleanup expired reminders:', error);
    }
  }

  /**
   * Get notification permissions status
   */
  static async getNotificationPermissionStatus() {
    try {
      if (Platform.OS === 'android') {
        const settings = await notifee.getNotificationSettings();

        // 🔥 Safe check for canScheduleExactAlarms function
        let canSchedule = true; // Default to true
        try {
          if (typeof notifee.canScheduleExactAlarms === 'function') {
            canSchedule = await notifee.canScheduleExactAlarms();
          }
        } catch (alarmError) {
          console.warn('⚠️ canScheduleExactAlarms check failed:', alarmError);
          canSchedule = true; // Assume true if check fails
        }

        return {
          granted: settings.authorizationStatus === 1, // AUTHORIZED
          canScheduleExactAlarms: canSchedule,
          settings,
        };
      }
      return { granted: true }; // iOS handles permissions differently
    } catch (error) {
      console.error('❌ Failed to get notification permission status:', error);
      return { granted: true, canScheduleExactAlarms: true }; // Return true to avoid blocking
    }
  }
}

export default ReminderNotificationService;

/**
 * USAGE EXAMPLES:
 * 
 * 1. Initialize in App.js:
 * ```
 * await ReminderNotificationService.initialize();
 * ```
 * 
 * 2. Schedule reminder:
 * ```
 * const result = await ReminderNotificationService.scheduleReminder({
 *   id: `reminder_${Date.now()}`,
 *   clientName: 'John Doe',
 *   message: 'Follow up on property enquiry',
 *   scheduledDate: new Date('2024-12-25T10:00:00'),
 *   enquiryId: 'enquiry_123',
 *   enquiry: enquiryObject
 * });
 * ```
 * 
 * 3. Cancel reminder:
 * ```
 * await ReminderNotificationService.cancelReminder('reminder_123');
 * ```
 */
