/**
 * AlertNotificationService.js
 * Scheduled notification service for CRM Alert System
 * Handles notifications at exact date/time specified in alerts
 */
import notifee, { 
  AndroidImportance, 
  TriggerType,
  AndroidCategory,
  AndroidStyle,
  AndroidVisibility,
  AndroidColor,
  RepeatFrequency
} from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALERT_CHANNEL_ID = 'enquiry_reminders'; // default for alerts
const ADMIN_REMINDER_CHANNEL_ID = 'admin_reminders'; // dedicated for admin reminders
const SILENT_TRIGGER_CHANNEL_ID = 'silent_triggers'; // silent channel for local trigger-only notifications
const ALERT_CHANNEL_NAME = 'System Alerts';
const ALERT_CHANNEL_DESCRIPTION = 'Scheduled system alerts and notifications';

class AlertNotificationService {
  /**
   * Initialize the alert notification service
   * Creates notification channels if needed
   */
  static async initialize() {
    try {
      // Create notification channel for Android (channel should already exist from ReminderNotificationService)
      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }
      
      console.log('✅ AlertNotificationService initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize AlertNotificationService:', error);
      return false;
    }
  }

  /**
   * Create notification channel with enhanced UI settings
   */
  static async createNotificationChannel() {
    try {
      const channelConfig = {
        id: ALERT_CHANNEL_ID,
        name: ALERT_CHANNEL_NAME,
        description: ALERT_CHANNEL_DESCRIPTION,
        importance: AndroidImportance.HIGH, // High importance for sound and vibration
        sound: 'default', // Use default notification sound
        vibration: true,
        vibrationPattern: [300, 500, 300, 500],
        lights: true,
        lightColor: AndroidColor.RED,
        badge: true,
        visibility: AndroidVisibility.PUBLIC,
        bypassDnd: false,
      };
      
      await notifee.createChannel(channelConfig);

      // 🔇 Silent trigger channel — fires Event 3 but shows NOTHING in notification tray
      // Used for local backup notifications when FCM already handles the tray display
      await notifee.createChannel({
        id: SILENT_TRIGGER_CHANNEL_ID,
        name: 'Background Triggers (Silent)',
        importance: AndroidImportance.NONE,
        vibration: false,
        sound: undefined,
        badge: false,
      });
      
      console.log('✅ Alert notification channel created successfully');
    } catch (error) {
      console.error('❌ Failed to create alert notification channel:', error);
    }
  }

  /**
   * Schedule an alert notification for exact date/time
   * @param {Object} alertData - Alert information
   * @param {string} alertData.id - Unique alert ID (from backend)
   * @param {string} alertData.date - Alert date (YYYY-MM-DD format)
   * @param {string} alertData.time - Alert time (HH:MM format)
   * @param {string} alertData.reason - Alert message/reason
   * @param {boolean} alertData.repeatDaily - Whether alert repeats daily
   */
  static async scheduleAlert(alertData) {
    // 🚫 LOCAL NOTIFICATION DISABLED — Only FCM push from backend should show
    console.log('📱 [DISABLED] scheduleAlert called but local notifications are disabled. Relying on backend FCM only.');
    console.log('   Alert ID:', alertData?.id, '| Reason:', (alertData?.reason || '').substring(0, 50));
    return {
      success: true,
      notificationId: `alert_${alertData?.id}`,
      scheduledFor: null,
      message: 'Local notification disabled — backend FCM handles delivery',
    };
    // 🚫 ORIGINAL LOCAL SCHEDULING CODE BELOW IS UNREACHABLE (after return)
    // eslint-disable-next-line no-unreachable
    try {
      const { 
        id, date, time, reason, 
        repeatDaily = false, 
        title = '',
        repeatFrequency = repeatDaily ? 'daily' : 'none',
      } = alertData;

      // repeatMetadata may arrive as a JSON string (from notification data) or as an object
      let repeatMetadata = alertData.repeatMetadata || {};
      if (typeof repeatMetadata === 'string') {
        try { repeatMetadata = JSON.parse(repeatMetadata); } catch(_) { repeatMetadata = {}; }
      }

      // customIntervalMinutes: check ALL possible field names (field names vary between paths)
      const customIntervalMinutes = parseInt(
        alertData.customRepeatMinutes ||
        alertData.customIntervalMinutes ||
        repeatMetadata.customIntervalMinutes ||
        repeatMetadata.customRepeatMinutes ||
        0  // NO default — 0 means not set
      ) || 0;

      // Validate required fields
      if (!id || !time || !reason) {
        throw new Error('Missing required alert fields (id, time, reason)');
      }

      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      let notificationDate = new Date();


      if (repeatFrequency === 'daily' || repeatDaily) {
        // Daily: use today at the specified time, or tomorrow if already passed
        notificationDate.setHours(hours, minutes, 0, 0);
        if (notificationDate <= now) {
          notificationDate.setDate(notificationDate.getDate() + 1);
          console.log('⏰ Daily: time passed today, scheduling for tomorrow');
        }

      } else if (repeatFrequency === 'weekly') {
        // Weekly: find next occurrence of the specified day of week
        const targetDay = repeatMetadata?.dayOfWeek ?? notificationDate.getDay();
        const todayDay = now.getDay();
        let daysUntilTarget = (targetDay - todayDay + 7) % 7;
        if (daysUntilTarget === 0) {
          // Same day — check if time has passed
          notificationDate.setHours(hours, minutes, 0, 0);
          if (notificationDate <= now) daysUntilTarget = 7; // Next week
        }
        notificationDate = new Date(now);
        notificationDate.setDate(now.getDate() + daysUntilTarget);
        notificationDate.setHours(hours, minutes, 0, 0);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`🔄 Weekly: next occurrence is ${dayNames[targetDay]} - ${notificationDate.toLocaleString()}`);

      } else if (repeatFrequency === 'monthly') {
        // Monthly: next occurrence of day-of-month
        const targetDayOfMonth = repeatMetadata?.dayOfMonth ?? now.getDate();
        notificationDate = new Date(now.getFullYear(), now.getMonth(), targetDayOfMonth, hours, minutes, 0, 0);
        if (notificationDate <= now) {
          // Move to next month
          notificationDate.setMonth(notificationDate.getMonth() + 1);
        }
        console.log(`🔄 Monthly: next occurrence is ${notificationDate.toLocaleString()}`);

      } else if (repeatFrequency === 'yearly') {
        // Yearly: next occurrence of month+day
        const targetMonth = (repeatMetadata?.month ?? (now.getMonth() + 1)) - 1; // 0-indexed
        const targetDay = repeatMetadata?.dayOfMonth ?? now.getDate();
        notificationDate = new Date(now.getFullYear(), targetMonth, targetDay, hours, minutes, 0, 0);
        if (notificationDate <= now) {
          notificationDate.setFullYear(notificationDate.getFullYear() + 1);
        }
        console.log(`🔄 Yearly: next occurrence is ${notificationDate.toLocaleString()}`);

      } else if (repeatFrequency === 'custom') {
        if (!customIntervalMinutes || customIntervalMinutes <= 0) {
          console.warn('⚠️ Custom repeat requested but interval is 0/missing — skipping schedule');
          return { success: false, error: 'Custom repeat interval not defined' };
        }
        // Custom: fire after N minutes from a base date (prevents drift)
        const base = alertData.baseDate ? new Date(alertData.baseDate) : now;
        
        // 🔥 CRITICAL FIX: Backend cron jobs always fire at exact 00 seconds.
        // We MUST truncate seconds to 0 so the local alarm perfectly syncs with the FCM message.
        // Otherwise, they fire seconds apart and the user gets buzzed twice (2 push notifications)!
        base.setSeconds(0, 0);
        
        const intervalMs = customIntervalMinutes * 60 * 1000;
        notificationDate = new Date(base.getTime() + intervalMs);
        
        // If the calculated date is already in the past, move forward by intervals until it's in the future
        while (notificationDate <= now) {
          notificationDate = new Date(notificationDate.getTime() + intervalMs);
        }
        
        console.log(`🔄 Custom: firing in ${customIntervalMinutes} mins from ${base.toLocaleTimeString()} at ${notificationDate.toLocaleString()}`);

      } else {
        // One-time alert: use the specified exact date
        if (!date) throw new Error('Missing date for one-time alert');
        const [year, month, day] = date.split('-').map(Number);
        notificationDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        if (notificationDate <= now) {
          console.warn('⚠️ Alert date/time is in the past. Skipping notification schedule.');
          return {
            success: false,
            error: 'Alert time is in the past',
            message: 'Cannot schedule notification for past date/time',
          };
        }
      }

      console.log('📅 Scheduling alert:', {
        id,
        date: repeatDaily ? 'Daily (ignored)' : date,
        time,
        reason: reason.substring(0, 50),
        notificationDate: notificationDate.toLocaleString(),
        now: now.toLocaleString(),
        repeatDaily
      });

      // Create timestamp trigger with alarmManager for background/killed state
      // 🔥 Use exact timing to minimize delays
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: notificationDate.getTime(),
        alarmManager: {
          allowWhileIdle: true, // Critical for background notifications
          exact: true, // Use exact alarm for precise timing
        },
      };

      // ⚠️ CRITICAL CHANGE: We no longer use Notifee's native repeatFrequency.
      // Native repeats (OS-managed) can be unreliable in background/killed states on some devices.
      // Instead, we use "Manual Rescheduling": Every notification is scheduled as a one-time 
      // EXACT alarm. When it fires, our background handler (NotificationHandler.js) calculates
      // the NEXT occurrence and schedules it as another one-time alarm.
      // This ensures our JS code runs on every delivery, making it much more robust.
      /*
      if (repeatFrequency === 'daily' || repeatDaily) {
        trigger.repeatFrequency = RepeatFrequency.DAILY;
      } else if (repeatFrequency === 'weekly') {
        trigger.repeatFrequency = RepeatFrequency.WEEKLY;
      } else if (repeatFrequency === 'monthly') {
        trigger.repeatFrequency = RepeatFrequency.MONTHLY;
      }
      */

      console.log(`🔄 Manual Rescheduling strategy enabled for ${repeatFrequency} repeat`);

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

      // 🔥 SYNC: Broad detection to match fcmService.js (fixes double IDs)
      const rAll = (String(alertData.notificationType || '') + " " + String(title || '')).toLowerCase();
      const isAlert = rAll.includes('alert') || rAll.includes('emergency') || rAll.includes('urgent');
      const isAdminReminder = !isAlert && (rAll.includes('admin') || !!alertData.id);
      
      const themeColor = isAdminReminder ? '#4F46E5' : '#EF4444'; // Indigo vs Red
      const themeLightColor = isAdminReminder ? AndroidColor.BLUE || '#4F46E5' : AndroidColor.RED || '#EF4444';
      const prefix = isAlert ? 'alert_' : 'reminder_';
      const defaultTitle = isAlert ? '🔔 Alert Notification' : '🔔 Admin Reminder';

      const repeatLabel = 
        repeatFrequency === 'daily' ? ' \u2022 \uD83D\uDD01 Daily' :
        repeatFrequency === 'weekly' ? ' \u2022 \uD83D\uDD01 Weekly' :
        repeatFrequency === 'monthly' ? ' \u2022 \uD83D\uDD01 Monthly' :
        repeatFrequency === 'yearly' ? ' \u2022 \uD83D\uDD01 Yearly' :
        repeatFrequency === 'custom' ? ` \u2022 \uD83D\uDD01 Every ${customIntervalMinutes}min` :
        repeatDaily ? ' \u2022 \uD83D\uDD01 Daily' : '';

      const notificationBody = {
        id: `${prefix}${id}`,
        title: title || defaultTitle,
        body: `${reason}\n\n\uD83D\uDCC5 ${dateString} \u2022 ${timeString}${repeatLabel}`,
        android: {
        // 🔔 Visible notification channel (restored)
        // Android Doze often suppresses 'importance: NONE' scheduled triggers.
        // We use the exact same ID as the FCM handler, so Notifee will overwrite 
        // and only ONE notification will appear in the tray.
        channelId: isAdminReminder ? ADMIN_REMINDER_CHANNEL_ID : ALERT_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.REMINDER,
          sound: 'default',
          vibrationPattern: [300, 500, 300, 500],
          onlyAlertOnce: true, // 🔥 Prevents double-buzz if FCM arrives seconds before Local Backup
          lights: [themeLightColor, 300, 600],
          color: themeColor,
          showTimestamp: true,
          timestamp: notificationDate.getTime(),
          visibility: AndroidVisibility.PUBLIC, // 🔥 CRITICAL for background visibility
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: `${reason}\n\n\uD83D\uDCC5 ${dateString} \u2022 ${timeString}${repeatLabel}`,
          },
        },
        ios: {
          sound: 'default',
          categoryId: 'alert',
        },
        data: {
          type: alertData.notificationType || 'alert',
          alertId: id,
          title: title,
          reason: reason,
          date: date || notificationDate.toISOString().split('T')[0],
          time,
          repeatFrequency,
          isLocalTrigger: 'true', // 🔥 CRITICAL to distinguish from FCM display
          scheduledAt: notificationDate.toISOString(), // 🔥 CRITICAL: Full ISO string for drift-free rescheduling
          repeatDaily: String(repeatFrequency === 'daily' || repeatDaily),
          repeatMetadata: JSON.stringify(repeatMetadata || {}),
          customRepeatMinutes: customIntervalMinutes ? String(customIntervalMinutes) : '',
          customIntervalMinutes: customIntervalMinutes ? String(customIntervalMinutes) : '',
          timestamp: Date.now(),
          navigationData: alertData.navigationData || JSON.stringify({
            scrollToAlert: id,
            showDetails: true,
            fromNotification: true,
            highlightAlert: id
          })
        },
      };

      // Schedule the notification
      await notifee.createTriggerNotification(notificationBody, trigger);

      // Store alert notification info locally
      await this.storeAlertNotificationLocally({
        id,
        date,
        time,
        reason,
        repeatDaily,
        scheduledFor: notificationDate.toISOString(),
        notificationId: `${prefix}${id}`, // ✅ matches actual Notifee notification ID
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      });

      console.log(`✅ Alert notification scheduled for ${notificationDate.toLocaleString()}`);
      console.log(`   Reason: ${reason.substring(0, 50)}`);
      if (repeatDaily) {
        console.log(`   📋 Note: Daily repeat is handled by backend FCM, not local notification`);
      }
      
      return {
        success: true,
        notificationId: `alert_${id}`,
        scheduledFor: notificationDate.toISOString(),
        message: `Alert scheduled for ${notificationDate.toLocaleString()}`,
      };

    } catch (error) {
      console.error('❌ Failed to schedule alert notification:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to schedule alert notification. Please try again.',
      };
    }
    // END OF ORIGINAL LOCAL SCHEDULING CODE (unreachable)
  }

  /**
   * Cancel ONLY the scheduled trigger (future alarm) — does NOT remove currently displayed tray notification.
   * Use this before rescheduling to prevent duplicate chains.
   * @param {string} alertId
   */
  static async cancelTrigger(alertId) {
    try {
      // cancelTriggerNotification only removes scheduled future triggers, NOT already-displayed notifications
      await notifee.cancelTriggerNotification(`alert_${alertId}`).catch(() => {});
      await notifee.cancelTriggerNotification(`reminder_${alertId}`).catch(() => {});
      console.log(`🔕 Trigger cancelled (display preserved) for ID: ${alertId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to cancel trigger:', error);
      return { success: false };
    }
  }

  /**
   * Cancel a scheduled alert notification (trigger + removes from tray)
   * Use this for delete/dismiss flows.
   * @param {string} alertId - The alert ID (will be prefixed with 'alert_' or 'reminder_')
   */
  static async cancelAlert(alertId) {
    try {
      // Try both prefixes — admin reminders use 'reminder_', standard alerts use 'alert_'
      await notifee.cancelNotification(`alert_${alertId}`).catch(() => {});
      await notifee.cancelNotification(`reminder_${alertId}`).catch(() => {});
      
      // Remove from local storage
      await this.removeAlertNotificationLocally(alertId);
      
      console.log(`✅ Alert notification cancelled for ID: ${alertId}`);
      return {
        success: true,
        message: 'Alert notification cancelled successfully',
      };
    } catch (error) {
      console.error('❌ Failed to cancel alert notification:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to cancel alert notification',
      };
    }
  }

  /**
   * Cancel all scheduled alert notifications
   */
  static async cancelAllAlerts() {
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await notifee.getTriggerNotifications();
      
      // Filter and cancel only alert notifications (those with id starting with 'alert_')
      const alertNotifications = scheduledNotifications.filter(
        notif => notif.notification.id && notif.notification.id.startsWith('alert_')
      );
      
      for (const notif of alertNotifications) {
        await notifee.cancelNotification(notif.notification.id);
      }
      
      // Clear local storage
      await AsyncStorage.removeItem('scheduled_alert_notifications');
      
      console.log(`✅ Cancelled ${alertNotifications.length} alert notifications`);
      return {
        success: true,
        count: alertNotifications.length,
        message: `Cancelled ${alertNotifications.length} alert notifications`,
      };
    } catch (error) {
      console.error('❌ Failed to cancel all alert notifications:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all scheduled alert notifications
   */
  static async getScheduledAlerts() {
    try {
      const scheduledNotifications = await notifee.getTriggerNotifications();
      
      // Filter only alert notifications
      const alertNotifications = scheduledNotifications
        .filter(notif => notif.notification.id && notif.notification.id.startsWith('alert_'))
        .map(notif => ({
          id: notif.notification.id,
          title: notif.notification.title,
          body: notif.notification.body,
          scheduledTime: notif.trigger.timestamp,
          data: notif.notification.data,
        }));
      
      return alertNotifications;
    } catch (error) {
      console.error('❌ Failed to get scheduled alerts:', error);
      return [];
    }
  }

  /**
   * Store alert notification info locally (for tracking)
   */
  static async storeAlertNotificationLocally(alertInfo) {
    try {
      const key = 'scheduled_alert_notifications';
      const stored = await AsyncStorage.getItem(key);
      const alerts = stored ? JSON.parse(stored) : [];
      
      // Add or update alert
      const existingIndex = alerts.findIndex(a => a.id === alertInfo.id);
      if (existingIndex >= 0) {
        alerts[existingIndex] = alertInfo;
      } else {
        alerts.push(alertInfo);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(alerts));
    } catch (error) {
      console.error('Failed to store alert notification locally:', error);
    }
  }

  /**
   * Remove alert notification from local storage
   */
  static async removeAlertNotificationLocally(alertId) {
    try {
      const key = 'scheduled_alert_notifications';
      const stored = await AsyncStorage.getItem(key);
      const alerts = stored ? JSON.parse(stored) : [];
      
      const filtered = alerts.filter(a => a.id !== alertId);
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove alert notification locally:', error);
    }
  }

  /**
   * Get locally stored alert notifications
   */
  static async getLocallyStoredAlerts() {
    try {
      const key = 'scheduled_alert_notifications';
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get locally stored alerts:', error);
      return [];
    }
  }

  /**
   * Reschedule an alert (useful for updates)
   */
  static async rescheduleAlert(alertData) {
    try {
      // Cancel existing notification
      await this.cancelAlert(alertData.id);
      
      // Schedule new notification
      return await this.scheduleAlert(alertData);
    } catch (error) {
      console.error('❌ Failed to reschedule alert:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default AlertNotificationService;
