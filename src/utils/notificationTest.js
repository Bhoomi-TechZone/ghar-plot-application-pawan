/**
 * Notification System Test Utility
 * Use this to test if notifications work in both app states
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNotification, getNotifications, getNotificationCount } from './notificationManager';

/**
 * Test notification storage and retrieval
 */
export const testNotificationSystem = async () => {
  console.log('🧪 Testing Notification System...');

  try {
    // Clear existing notifications for clean test
    await AsyncStorage.removeItem('notifications');
    console.log('🧹 Cleared existing notifications');

    // Test 1: Add a property notification
    console.log('\n📝 Test 1: Adding property notification...');
    const propertyNotification = {
      type: 'property',
      title: 'Test Property Added',
      message: 'A test property has been added to the system',
      propertyId: 'test-property-123',
      image: 'https://example.com/property.jpg'
    };

    await addNotification(propertyNotification);
    console.log('✅ Property notification added');

    // Test 2: Add an inquiry notification
    console.log('\n📝 Test 2: Adding inquiry notification...');
    const inquiryNotification = {
      type: 'inquiry',
      title: 'Test Inquiry Received',
      message: 'Someone inquired about your property',
      propertyId: 'test-property-123',
      inquiryId: 'test-inquiry-456'
    };

    await addNotification(inquiryNotification);
    console.log('✅ Inquiry notification added');

    // Test 3: Add a chat notification
    console.log('\n📝 Test 3: Adding chat notification...');
    const chatNotification = {
      type: 'chat',
      title: 'Test Message',
      message: 'You have a new message from TestUser',
      chatId: 'test-chat-789'
    };

    await addNotification(chatNotification);
    console.log('✅ Chat notification added');

    // Test 4: Get notification count
    console.log('\n📝 Test 4: Getting notification count...');
    const count = await getNotificationCount();
    console.log(`📊 Total notifications: ${count}`);

    // Test 5: Get all notifications
    console.log('\n📝 Test 5: Getting all notifications...');
    const notifications = await getNotifications();
    console.log(`📋 Retrieved ${notifications.length} notifications:`);

    notifications.forEach((notification, index) => {
      console.log(`  ${index + 1}. [${notification.type}] ${notification.title}`);
      console.log(`     ${notification.message}`);
      console.log(`     Time: ${new Date(notification.timestamp).toLocaleString()}`);
      console.log(`     Read: ${notification.isRead ? 'Yes' : 'No'}`);
    });

    console.log('\n✅ All notification tests passed!');
    return { success: true, count, notifications };

  } catch (error) {
    console.error('❌ Notification test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test backend notification API
 */
export const testBackendNotification = async () => {
  console.log('🧪 Testing Backend Notification API...');

  try {
    const payload = {
      title: "🧪 Test Backend Notification",
      message: "This is a test notification sent from the app to verify backend integration works correctly."
    };

    console.log('📤 Sending test notification to backend...');

    const response = await fetch('https://gharplotbackend.gntechnology.de/application/notify-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Backend notification test successful:', result);
      console.log(`📊 Sent to: ${result.sentCount} users, Failed: ${result.failedCount} users`);
      return { success: true, result };
    } else {
      console.error('❌ Backend notification test failed:', result);
      return { success: false, error: result };
    }

  } catch (error) {
    console.error('❌ Backend notification test error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test FCM token retrieval
 */
export const testFCMToken = async () => {
  console.log('🧪 Testing FCM Token...');

  try {
    const { getFCMToken } = await import('./fcmService');
    const token = await getFCMToken();

    if (token) {
      console.log('✅ FCM Token retrieved successfully');
      console.log(`🔑 Token: ${token.substring(0, 50)}...`);
      return { success: true, token };
    } else {
      console.warn('⚠️ FCM Token is null or empty');
      return { success: false, error: 'No FCM token' };
    }

  } catch (error) {
    console.error('❌ FCM Token test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete notification system test
 * Tests local storage, backend API, and FCM token
 */
export const runCompleteNotificationTest = async () => {
  console.log('🚀 Running Complete Notification System Test...\n');

  const results = {
    localStorage: await testNotificationSystem(),
    backend: await testBackendNotification(),
    fcmToken: await testFCMToken()
  };

  console.log('\n📊 Test Results Summary:');
  console.log(`Local Storage: ${results.localStorage.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Backend API: ${results.backend.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`FCM Token: ${results.fcmToken.success ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = results.localStorage.success && results.backend.success && results.fcmToken.success;
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  return results;
};

/**
 * Quick test function to add from anywhere in the app
 * Usage: import { quickNotificationTest } from '../utils/notificationTest'; quickNotificationTest();
 */
export const quickNotificationTest = async () => {
  console.log('⚡ Quick Notification Test...');
  return await testNotificationSystem();
};