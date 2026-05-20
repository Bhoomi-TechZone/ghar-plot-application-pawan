/**
 * FCMReminderService.js
 * Server-based reminder notifications using Firebase Cloud Messaging
 * More reliable across different phone manufacturers
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de'; // Your backend URL

class FCMReminderService {
  /**
   * Initialize FCM and get device token
   */
  static async initialize() {
    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM Permission granted');

        // Get FCM token
        const token = await this.getFCMToken();
        if (token) {
          console.log('✅ FCM Token obtained');
          // Send token to backend
          await this.registerTokenWithBackend(token);
        }

        return true;
      } else {
        console.warn('⚠️ FCM Permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ FCM initialization failed:', error);
      return false;
    }
  }

  /**
   * Get FCM token
   */
  static async getFCMToken() {
    try {
      const token = await messaging().getToken();
      await AsyncStorage.setItem('fcm_token', token);
      return token;
    } catch (error) {
      console.error('❌ Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Register token with backend
   */
  static async registerTokenWithBackend(token) {
    try {
      const userId = await AsyncStorage.getItem('userId'); // Your user ID
      const authToken = await AsyncStorage.getItem('authToken'); // Your auth token

      if (!authToken) {
        console.warn('⚠️ No auth token, skipping FCM registration');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/fcm/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId,
          fcmToken: token,
          deviceType: 'android',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        console.log('✅ FCM token registered with backend');
      } else {
        console.warn('⚠️ Failed to register FCM token with backend');
      }
    } catch (error) {
      console.error('❌ Failed to register token:', error);
    }
  }

  /**
   * Schedule reminder via backend (will send FCM at scheduled time)
   * @param {Object} reminderData - Reminder information
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
      if (!clientName || !message || !scheduledDate) {
        throw new Error('Missing required reminder fields');
      }

      // Validate that scheduled date is in the future
      const scheduledTime = new Date(scheduledDate).getTime();
      const currentTime = Date.now();

      if (scheduledTime <= currentTime) {
        const diffMinutes = Math.round((currentTime - scheduledTime) / 60000);
        console.warn(`⚠️ Reminder time is ${diffMinutes} minutes in the past. Skipping scheduling.`);
        return {
          success: false,
          error: 'Reminder must be scheduled for a future date',
          message: 'Cannot schedule reminders for past dates',
        };
      }

      const authToken = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!authToken) {
        throw new Error('Authentication required');
      }

      // Send to backend to schedule FCM
      console.log('📤 Sending reminder to backend for FCM scheduling...');
      console.log(`   Client: ${clientName}`);
      console.log(`   Time: ${new Date(scheduledDate).toLocaleString()}`);

      const response = await fetch(`${API_BASE_URL}/api/reminders/schedule-fcm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          reminderId: id || `reminder_${Date.now()}`,
          userId,
          clientName,
          message,
          scheduledDate,
          enquiryId,
          enquiryData: enquiry,
          notificationType: 'reminder',
          // FCM specific data
          notification: {
            title: `🔔 Reminder: ${clientName}`,
            body: message,
          },
          data: {
            type: 'enquiry_reminder',
            targetScreen: 'EnquiriesScreen',
            enquiryId: enquiryId,
            clientName: clientName,
            timestamp: Date.now().toString(),
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Reminder scheduled via FCM successfully!');
        console.log(`   Will be sent at: ${new Date(scheduledDate).toLocaleString()}`);

        return {
          success: true,
          message: `Reminder scheduled for ${new Date(scheduledDate).toLocaleString()}`,
          scheduledFor: scheduledDate,
          method: 'FCM',
        };
      } else {
        throw new Error(result.message || 'Failed to schedule reminder');
      }
    } catch (error) {
      console.error('❌ Failed to schedule FCM reminder:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to schedule reminder via server',
      };
    }
  }

  /**
   * Cancel scheduled reminder
   */
  static async cancelReminder(reminderId) {
    try {
      const authToken = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/api/reminders/cancel-fcm/${reminderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Reminder cancelled successfully');
        return { success: true };
      } else {
        throw new Error(result.message || 'Failed to cancel');
      }
    } catch (error) {
      console.error('❌ Failed to cancel reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all scheduled reminders for current user
   */
  static async getScheduledReminders() {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');

      const response = await fetch(`${API_BASE_URL}/api/reminders/scheduled/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        return result.reminders || [];
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Failed to get reminders:', error);
      return [];
    }
  }
}

export default FCMReminderService;
