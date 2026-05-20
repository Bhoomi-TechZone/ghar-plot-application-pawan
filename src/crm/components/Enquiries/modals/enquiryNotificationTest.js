/**
 * Enquiry Reminder Test Helper
 * Quick testing functions for enquiry reminder notifications
 */
import ReminderNotificationService from '../../../services/ReminderNotificationService';

export const testEnquiryNotification = async (delay = 10) => {
  try {
    console.log(`🧪 Creating test enquiry notification in ${delay} seconds...`);
    
    const testTime = new Date(Date.now() + (delay * 1000));
    
    const testNotification = {
      id: `test_enquiry_${Date.now()}`,
      clientName: 'Test Client',
      message: 'This is a test enquiry reminder notification',
      scheduledDate: testTime,
      enquiryId: 'test_enquiry_id',
      enquiry: {
        _id: 'test_enquiry_id',
        clientName: 'Test Client',
        contactNumber: '9999999999'
      },
      targetScreen: 'EnquiriesScreen',
      navigationType: 'nested',
      navigationData: {
        enquiryId: 'test_enquiry_id',
        clientName: 'Test Client',
        clientPhone: '9999999999',
        isReminderNotification: true,
        fromNotification: true,
        reminderType: 'enquiry_follow_up'
      }
    };
    
    const result = await ReminderNotificationService.scheduleReminder(testNotification);
    
    if (result.success) {
      console.log(`✅ Test notification scheduled for: ${testTime.toLocaleString()}`);
      console.log('📱 You should receive notification in the background/killed app state');
      return `Test notification scheduled for ${testTime.toLocaleString()}`;
    } else {
      console.error('❌ Test notification failed:', result.message);
      return `Failed: ${result.message}`;
    }
    
  } catch (error) {
    console.error('❌ Test notification error:', error);
    return `Error: ${error.message}`;
  }
};

// Make available globally in development mode
if (__DEV__) {
  global.testEnquiryNotification = testEnquiryNotification;
  
  global.debugEnquiryNotifications = {
    // Test immediate (10 seconds)
    testNow: () => testEnquiryNotification(10),
    
    // Test in 30 seconds  
    test30s: () => testEnquiryNotification(30),
    
    // Test in 1 minute
    test1min: () => testEnquiryNotification(60),
    
    // Check scheduled notifications
    checkScheduled: async () => {
      try {
        const scheduled = await ReminderNotificationService.getAllScheduledNotifications();
        console.log('📅 Scheduled notifications:', scheduled);
        return scheduled;
      } catch (error) {
        console.error('❌ Failed to check scheduled:', error);
        return [];
      }
    }
  };
  
  console.log('🛠️ Enquiry notification debug tools available:');
  console.log('  testEnquiryNotification(10) // 10 seconds delay');
  console.log('  debugEnquiryNotifications.testNow()');
  console.log('  debugEnquiryNotifications.test30s()');
  console.log('  debugEnquiryNotifications.test1min()');
  console.log('  debugEnquiryNotifications.checkScheduled()');
}