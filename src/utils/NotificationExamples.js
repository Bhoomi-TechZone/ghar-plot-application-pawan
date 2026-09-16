/**
 * Enhanced Notification Scheduling Examples
 * Production-ready examples for scheduling notifications with navigation data
 */

import ReminderNotificationService from '../services/ReminderNotificationService';
import NavigationService from '../services/NavigationService';
import CrossPlatformAlert from './crossPlatformAlert';

// Example 1: Schedule notification to open specific enquiry detail
export const scheduleEnquiryDetailNotification = async (enquiry, reminderDate) => {
  const reminderData = {
    id: `enquiry_detail_${enquiry._id}_${Date.now()}`,
    clientName: enquiry.clientName,
    message: `Follow up with ${enquiry.clientName} regarding property inquiry`,
    scheduledDate: reminderDate,
    enquiryId: enquiry._id,
    enquiry: enquiry,
    
    // Navigation configuration
    targetScreen: 'EnquiryDetail',      // Open detail screen directly
    navigationType: 'stack',            // Use stack navigation
  };

  return await ReminderNotificationService.scheduleReminder(reminderData);
};

// Example 2: Schedule notification to open enquiries list
export const scheduleEnquiryListNotification = async (clientName, reminderDate, enquiryId) => {
  const reminderData = {
    id: `enquiry_list_${enquiryId}_${Date.now()}`,
    clientName: clientName,
    message: `Review pending enquiries and follow up`,
    scheduledDate: reminderDate,
    enquiryId: enquiryId,
    
    // Navigation configuration
    targetScreen: 'Enquiries',          // Open enquiries list
    navigationType: 'nested',           // Use nested navigation (tab inside stack)
  };

  return await ReminderNotificationService.scheduleReminder(reminderData);
};

// Example 3: Schedule notification to reset app to dashboard
export const scheduleDashboardNotification = async (message, reminderDate) => {
  const reminderData = {
    id: `dashboard_${Date.now()}`,
    clientName: 'System',
    message: message,
    scheduledDate: reminderDate,
    
    // Navigation configuration
    targetScreen: 'AdminMainTabs',      // Reset to main dashboard
    navigationType: 'reset',            // Reset entire navigation stack
  };

  return await ReminderNotificationService.scheduleReminder(reminderData);
};

// Example 4: Schedule notification for leads screen
export const scheduleLeadsNotification = async (leadData, reminderDate) => {
  const reminderData = {
    id: `lead_${leadData.id}_${Date.now()}`,
    clientName: leadData.clientName,
    message: `Follow up on lead: ${leadData.clientName}`,
    scheduledDate: reminderDate,
    enquiryId: leadData.id,
    
    // Navigation configuration
    targetScreen: 'AllLeads',           // Open leads screen
    navigationType: 'nested',           // Nested in tabs
  };

  return await ReminderNotificationService.scheduleReminder(reminderData);
};

// Example 5: Quick 1-hour reminder (commonly used)
export const scheduleQuickReminder = async (enquiry) => {
  const reminderDate = new Date();
  reminderDate.setHours(reminderDate.getHours() + 1); // 1 hour from now

  const reminderData = {
    id: `quick_${enquiry._id}_${Date.now()}`,
    clientName: enquiry.clientName,
    message: `⏰ Quick reminder: Follow up with ${enquiry.clientName}`,
    scheduledDate: reminderDate,
    enquiryId: enquiry._id,
    enquiry: enquiry,
    
    // Default to enquiries list
    targetScreen: 'Enquiries',
    navigationType: 'nested',
  };

  return await ReminderNotificationService.scheduleReminder(reminderData);
};

/**
 * Utility function to test notification navigation
 * Use this in development to test different navigation scenarios
 */
export const testNotificationNavigation = {
  // Test foreground navigation
  testForeground: async () => {
    if (__DEV__) {
      const success = await NavigationService.navigateFromNotification({
        targetScreen: 'Enquiries',
        navigationType: 'nested',
        enquiryId: 'test_123',
        clientName: 'Test Client'
      });
      console.log('🧪 Foreground test result:', success);
    }
  },

  // Test different screen types
  testScreenTypes: async () => {
    if (__DEV__) {
      const tests = [
        { targetScreen: 'Enquiries', navigationType: 'nested' },
        { targetScreen: 'AllLeads', navigationType: 'nested' },
        { targetScreen: 'EnquiryDetail', navigationType: 'stack' },
        { targetScreen: 'AdminMainTabs', navigationType: 'reset' }
      ];

      for (const test of tests) {
        console.log(`🧪 Testing ${test.targetScreen} with ${test.navigationType}`);
        await NavigationService.navigateFromNotification({
          ...test,
          enquiryId: 'test_' + Date.now(),
          clientName: 'Test Client'
        });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
      }
    }
  }
};

// Example usage in components:
/*
// In EnquiryCard.js:
const handleQuickReminder = async () => {
  const result = await scheduleQuickReminder(enquiry);
  if (result.success) {
    CrossPlatformAlert.alert('✅ Reminder Set', 'You will be notified in 1 hour');
  }
};

// In ReminderModal.js:
const handleCustomReminder = async (reminderDate) => {
  const result = await scheduleEnquiryListNotification(
    enquiry.clientName,
    reminderDate,
    enquiry._id
  );
  if (result.success) {
    CrossPlatformAlert.alert('✅ Reminder Scheduled', 'Notification will open enquiries list');
  }
};

// For development testing:
// Add this to any screen for testing
if (__DEV__) {
  global.testNotifications = testNotificationNavigation;
  // Usage: testNotifications.testForeground()
}
*/

export default {
  scheduleEnquiryDetailNotification,
  scheduleEnquiryListNotification,
  scheduleDashboardNotification,
  scheduleLeadsNotification,
  scheduleQuickReminder,
  testNotificationNavigation
};