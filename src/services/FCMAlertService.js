/**
 * FCMAlertService.js
 * Server-based alert notifications using Firebase Cloud Messaging
 * More reliable across different phone manufacturers
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

class FCMAlertService {
  /**
   * Schedule alert via backend (will send FCM at scheduled time)
   * @param {Object} alertData - Alert information
   */
  static async scheduleAlert(alertData) {
    try {
      const { id, date, time, reason, repeatDaily = false } = alertData;

      // Validate required fields
      if (!date || !time || !reason) {
        throw new Error('Missing required alert fields (date, time, reason)');
      }

      const authToken = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!authToken) {
        throw new Error('Authentication required');
      }

      // Combine date and time
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

      // Validate future date
      if (scheduledDate <= new Date()) {
        throw new Error('Alert must be scheduled for future date/time');
      }

      console.log('📤 Sending alert to backend for FCM scheduling...');
      console.log(`   Time: ${scheduledDate.toLocaleString()}`);
      console.log(`   Reason: ${reason.substring(0, 50)}`);

      const response = await fetch(`${API_BASE_URL}/api/alerts/schedule-fcm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          alertId: id,
          userId,
          date,
          time,
          reason,
          repeatDaily,
          scheduledTimestamp: scheduledDate.getTime(),
          // FCM specific data
          notification: {
            title: '🔔 System Alert',
            body: reason,
          },
          data: {
            type: 'system_alert',
            targetScreen: 'Alerts',
            alertId: id,
            date,
            time,
            reason,
            timestamp: Date.now().toString(),
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Alert scheduled via FCM successfully!');
        console.log(`   Will be sent at: ${scheduledDate.toLocaleString()}`);

        return {
          success: true,
          message: `Alert scheduled for ${scheduledDate.toLocaleString()}`,
          scheduledFor: scheduledDate.toISOString(),
          method: 'FCM',
        };
      } else {
        throw new Error(result.message || 'Failed to schedule alert');
      }
    } catch (error) {
      console.error('❌ Failed to schedule FCM alert:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to schedule alert via server',
      };
    }
  }

  /**
   * Cancel scheduled alert
   */
  static async cancelAlert(alertId) {
    try {
      const authToken = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/api/alerts/cancel-fcm/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Alert cancelled successfully');
        return { success: true };
      } else {
        throw new Error(result.message || 'Failed to cancel');
      }
    } catch (error) {
      console.error('❌ Failed to cancel alert:', error);
      return { success: false, error: error.message };
    }
  }
}

export default FCMAlertService;
