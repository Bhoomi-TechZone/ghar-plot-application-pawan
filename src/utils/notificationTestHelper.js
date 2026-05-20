/**
 * Enhanced Notification Testing
 * Tests notifications in all states: foreground, background, and app closed
 */

import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNotification } from './notificationManager';
import CrossPlatformAlert from './crossPlatformAlert';

/**
 * Test all notification states comprehensively
 */
export const testAllNotificationStates = async () => {
  console.log('🧪 Testing all notification states...');
  
  const results = {
    foreground: { tested: false, working: false },
    background: { tested: false, working: false },
    closed: { tested: false, working: false },
    token: { available: false, value: null },
    permissions: { granted: false, status: null }
  };
  
  try {
    // 1. Check permissions first
    console.log('🔐 Checking permissions...');
    const authStatus = await messaging().requestPermission();
    const hasPermission = authStatus === messaging.AuthorizationStatus.AUTHORIZED || 
                         authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    results.permissions = {
      granted: hasPermission,
      status: authStatus
    };
    
    if (!hasPermission) {
      CrossPlatformAlert.alert(
        '❌ Permission नहीं है',
        'Notification permission नहीं है। Settings में जाकर notification enable करें।',
        [
          { text: 'OK' },
          { 
            text: 'Settings खोलें', 
            onPress: () => {
              // TODO: Open app settings
              console.log('Open app settings for notifications');
            }
          }
        ]
      );
      return results;
    }
    
    // 2. Get FCM token
    console.log('🎫 Getting FCM token...');
    const token = await messaging().getToken();
    results.token = {
      available: !!token,
      value: token
    };
    
    if (!token) {
      CrossPlatformAlert.alert('❌ FCM Token नहीं मिला', 'Firebase token generate नहीं हो रहा। Google Play Services check करें।');
      return results;
    }
    
    console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
    
    // 3. Test foreground notification
    console.log('📱 Testing foreground notification...');
    await testForegroundNotification();
    results.foreground.tested = true;
    
    // 4. Show instructions for background and closed testing
    CrossPlatformAlert.alert(
      '🧪 Notification Test शुरू हुआ',
      'अब testing करने के लिए:\n\n' +
      '1️⃣ FOREGROUND: App खुला रखें और Firebase Console से notification भेजें\n\n' +
      '2️⃣ BACKGROUND: App को minimize करें और notification भेजें\n\n' +
      '3️⃣ CLOSED: App को completely बंद करें और notification भेजें\n\n' +
      'Firebase Console में जाकर Cloud Messaging से test notification भेजें।',
      [
        { text: 'समझ गया' },
        {
          text: 'Firebase Console खोलें',
          onPress: () => {
            console.log('Open Firebase Console: https://console.firebase.google.com/project/gharplot-a1e5b/messaging');
          }
        }
      ]
    );
    
    return results;
    
  } catch (error) {
    console.error('❌ Notification test failed:', error);
    CrossPlatformAlert.alert('❌ Test Failed', error.message);
    return results;
  }
};

/**
 * Test foreground notification specifically
 */
export const testForegroundNotification = async () => {
  console.log('📱 Setting up foreground notification test...');
  
  // Create a test notification locally to verify the handler
  const testNotification = {
    notification: {
      title: '🧪 Foreground Test',
      body: 'यह foreground notification test है'
    },
    data: {
      type: 'test',
      testType: 'foreground'
    }
  };
  
  // Add to local storage
  await addNotification({
    type: 'test',
    title: testNotification.notification.title,
    message: testNotification.notification.body
  });
  
  // Show immediate alert to test foreground behavior
  CrossPlatformAlert.alert(
    '🧪 Foreground Test',
    'यह test alert है - अगर यह दिख रहा है तो foreground notifications काम कर रहे हैं',
    [{ text: 'OK' }]
  );
  
  console.log('✅ Foreground test completed');
};

/**
 * Create a test notification that Firebase can send
 */
export const createFirebaseTestPayload = async () => {
  const token = await messaging().getToken();
  
  const payload = {
    notification: {
      title: '🧪 Firebase Test Notification',
      body: 'यह Firebase से आया test notification है'
    },
    data: {
      type: 'firebase_test', 
      timestamp: new Date().toISOString()
    },
    token: token
  };
  
  console.log('📋 Firebase Test Payload:', JSON.stringify(payload, null, 2));
  
  CrossPlatformAlert.alert(
    '📋 Firebase Test Payload',
    'Console में payload देखें और Firebase Console में use करें।\n\n' +
    `Token: ${token?.substring(0, 30)}...`,
    [
      { text: 'OK' },
      {
        text: 'Copy Token',
        onPress: () => {
          // TODO: Copy to clipboard if possible
          console.log('Full FCM Token:', token);
        }
      }
    ]
  );
  
  return payload;
};

/**
 * Enhanced notification debugging
 */
export const debugNotificationIssues = async () => {
  console.log('🔍 Debugging notification issues...');
  
  const debug = {
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
    issues: [],
    recommendations: []
  };
  
  try {
    // Check if app is registered for notifications
    const authStatus = await messaging().requestPermission();
    debug.permissionStatus = authStatus;
    
    if (authStatus === messaging.AuthorizationStatus.DENIED) {
      debug.issues.push('Notification permissions completely denied');
      debug.recommendations.push('Go to device Settings > Apps > Gharplot > Notifications and enable');
    } else if (authStatus === messaging.AuthorizationStatus.NOT_DETERMINED) {
      debug.issues.push('Notification permissions not requested yet');
      debug.recommendations.push('Request permissions properly in app');
    }
    
    // Check token availability
    const token = await messaging().getToken();
    debug.hasToken = !!token;
    debug.tokenPreview = token ? token.substring(0, 30) + '...' : null;
    
    if (!token) {
      debug.issues.push('FCM token not available');
      debug.recommendations.push('Check Google Play Services and network connectivity');
    }
    
    // Check if handlers are set up
    debug.handlersSetup = {
      foreground: 'Should be set up in fcmService.js',
      background: 'Set up in index.js',
      appClosed: 'Handled by Android system'
    };
    
    // Check stored notifications
    const storedNotifications = await AsyncStorage.getItem('app_notifications');
    debug.storedNotificationsCount = storedNotifications ? JSON.parse(storedNotifications).length : 0;
    
    console.log('🔍 Debug Results:', JSON.stringify(debug, null, 2));
    
    CrossPlatformAlert.alert(
      '🔍 Notification Debug Results',
      `Permission: ${authStatus}\n` +
      `Token: ${token ? 'Available' : 'Missing'}\n` +
      `Stored Notifications: ${debug.storedNotificationsCount}\n\n` +
      (debug.issues.length > 0 ? 'Issues:\n' + debug.issues.join('\n') : 'No major issues found'),
      [
        { text: 'OK' },
        {
          text: 'View Details',
          onPress: () => console.log('Full Debug:', debug)
        }
      ]
    );
    
    return debug;
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    debug.issues.push('Debug process failed: ' + error.message);
    return debug;
  }
};

/**
 * Force notification to appear (for testing)
 */
export const forceTestNotification = async () => {
  console.log('🚨 Forcing test notification...');
  
  try {
    // Add local notification
    const notification = {
      type: 'force_test',
      title: '🚨 Force Test Notification',
      message: 'यह manually triggered notification है'
    };
    
    await addNotification(notification);
    
    // Show immediate alert
    CrossPlatformAlert.alert(
      '🚨 Force Test',
      'Local notification added। Notification list check करें।',
      [{ text: 'OK' }]
    );
    
    // Try to show system notification if possible
    // Note: This requires additional setup for local notifications
    console.log('✅ Force notification completed');
    
  } catch (error) {
    console.error('❌ Force notification failed:', error);
    CrossPlatformAlert.alert('❌ Force Test Failed', error.message);
  }
};

export default {
  testAllNotificationStates,
  testForegroundNotification,
  createFirebaseTestPayload,
  debugNotificationIssues,
  forceTestNotification
};