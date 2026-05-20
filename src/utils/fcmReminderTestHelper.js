/**
 * FCM Reminder Test Helper
 * Development utility for testing reminder notifications
 * 
 * Usage in React Native Debugger console:
 * global.testReminderNotification()
 * global.testReminderNotification({ clientName: 'Shiva Kumar', phoneNumber: '9876543210' })
 */

import { testReminderNotification, getFCMToken, createReminderNotificationPayload } from './fcmService';

// Make testing functions globally available in development
if (__DEV__) {
  // Test reminder notification with custom data
  global.testReminderNotification = testReminderNotification;
  
  // Get current FCM token
  global.getFCMToken = async () => {
    try {
      const token = await getFCMToken();
      console.log('📱 Current FCM Token:', token);
      return token;
    } catch (error) {
      console.error('❌ Failed to get FCM token:', error);
    }
  };
  
  // Create reminder payload for backend testing
  global.createReminderPayload = (reminderData) => {
    const payload = createReminderNotificationPayload(reminderData || {
      clientName: 'Test Client',
      note: 'Test reminder call',
      phoneNumber: '9999999999',
      enquiryId: 'test-enquiry',
      reminderId: 'test-reminder'
    });
    
    console.log('🔔 Reminder notification payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    return payload;
  };
  
  // Quick test functions
  global.testQuickReminder = () => {
    return testReminderNotification({
      clientName: 'John Doe',
      note: 'Follow up on property inquiry',
      phoneNumber: '9876543210',
      enquiryId: 'ENQ123',
      reminderId: 'REM456'
    });
  };
  
  // Simulate FCM reminder notification (for foreground testing)
  global.simulateFCMReminder = (reminderData = {}) => {
    const mockFCMMessage = {
      notification: {
        title: '⏰ रिमाइंडर',
        body: `${reminderData.clientName || 'Test Client'} को कॉल करने का समय`
      },
      data: {
        type: 'reminder',
        reminderId: reminderData.reminderId || 'test-reminder',
        enquiryId: reminderData.enquiryId || 'test-enquiry',
        clientName: reminderData.clientName || 'Test Client',
        phoneNumber: reminderData.phoneNumber || '9999999999',
        note: reminderData.note || 'Test reminder'
      }
    };
    
    console.log('🧪 Simulating FCM reminder:', mockFCMMessage);
    
    // Import and trigger the foreground handler directly
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('fcmReminderReceived', mockFCMMessage);
    
    return mockFCMMessage;
  };
  
  // Console log available commands
  setTimeout(() => {
    console.log('\n🔔 FCM Reminder Test Commands Available:');
    console.log('📱 global.testReminderNotification() - Test reminder notification');
    console.log('📱 global.testReminderNotification({clientName: "John", phoneNumber: "123456"}) - Custom reminder');
    console.log('📱 global.getFCMToken() - Get current FCM token');
    console.log('📱 global.createReminderPayload() - Generate reminder payload for backend');
    console.log('📱 global.testQuickReminder() - Quick test with sample data');
    console.log('📱 global.simulateFCMReminder() - Simulate foreground reminder notification');
    console.log('');
  }, 3000);
}

export { testReminderNotification, getFCMToken, createReminderNotificationPayload };