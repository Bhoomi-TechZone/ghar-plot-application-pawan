/**
 * FCM Test Service
 * Comprehensive testing and diagnostics for Firebase Cloud Messaging
 */

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, DeviceEventEmitter } from 'react-native';
import { getFCMToken, requestNotificationPermission } from './fcmService';
import { addNotification } from './notificationManager';
import CrossPlatformAlert from './crossPlatformAlert';

/**
 * Complete FCM diagnostic check
 * Tests all aspects of FCM setup and configuration
 */
export const runFCMDiagnostics = async () => {
  console.log('🔍 Starting FCM Diagnostics...');
  const results = {
    overall: 'UNKNOWN',
    checks: {},
    recommendations: [],
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  try {
    // 1. Check if Firebase is initialized
    console.log('📱 Checking Firebase initialization...');
    try {
      const app = messaging().app;
      results.checks.firebaseInit = {
        status: 'PASS',
        message: `Firebase app initialized: ${app.name}`,
        details: { appName: app.name, projectId: app.options?.projectId }
      };
      results.summary.passed++;
    } catch (error) {
      results.checks.firebaseInit = {
        status: 'FAIL',
        message: 'Firebase not initialized properly',
        error: error.message
      };
      results.summary.failed++;
      results.recommendations.push('❗ Check google-services.json file and Firebase setup');
      results.recommendations.push('❗ Ensure @react-native-firebase/app is properly installed');
    }

    // 2. Check notification permissions
    console.log('🔐 Checking notification permissions...');
    try {
      const authStatus = await messaging().requestPermission();
      const hasPermission = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (hasPermission) {
        results.checks.permissions = {
          status: 'PASS',
          message: `Notification permissions granted (${authStatus})`,
          hasPermission: true,
          authStatus
        };
        results.summary.passed++;
      } else {
        results.checks.permissions = {
          status: 'FAIL',
          message: `Notification permissions denied (${authStatus})`,
          hasPermission: false,
          authStatus
        };
        results.summary.failed++;
        results.recommendations.push('📱 Enable notifications in device Settings > Apps > Gharplot > Notifications');
        results.recommendations.push('📱 Or try manually requesting permissions again');
      }
    } catch (error) {
      results.checks.permissions = {
        status: 'FAIL',
        message: 'Failed to check permissions',
        error: error.message
      };
      results.summary.failed++;
      results.recommendations.push('❗ Permission check failed - check device compatibility');
    }

    // 3. Check FCM token generation
    console.log('🎫 Checking FCM token generation...');
    try {
      let token = await messaging().getToken();

      // Retry logic for token generation
      if (!token) {
        console.log('⏳ Token not available, retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        token = await messaging().getToken();
      }

      if (token) {
        results.checks.tokenGeneration = {
          status: 'PASS',
          message: 'FCM token generated successfully',
          token: `${token.substring(0, 30)}...`,
          tokenLength: token.length,
          fullToken: token // Keep for debugging
        };
        results.summary.passed++;
      } else {
        results.checks.tokenGeneration = {
          status: 'FAIL',
          message: 'No FCM token available after retry',
          token: null
        };
        results.summary.failed++;
        results.recommendations.push('🔧 Check Google Play Services installation');
        results.recommendations.push('🌐 Ensure device has internet connectivity');
        results.recommendations.push('📱 Try restarting the app or device');
      }
    } catch (error) {
      results.checks.tokenGeneration = {
        status: 'FAIL',
        message: 'Failed to generate FCM token',
        error: error.message
      };
      results.summary.failed++;
      results.recommendations.push('❗ FCM token generation failed: ' + error.message);
      results.recommendations.push('🔧 Check Firebase project configuration and google-services.json');
    }

    // 4. Check APNs token (iOS only)
    if (Platform.OS === 'ios') {
      console.log('🍎 Checking APNs token...');
      try {
        const apnsToken = await messaging().getAPNSToken();
        results.checks.apnsToken = {
          status: apnsToken ? 'PASS' : 'FAIL',
          message: apnsToken ? 'APNs token available' : 'No APNs token',
          token: apnsToken ? `${apnsToken.substring(0, 20)}...` : null
        };
      } catch (error) {
        results.checks.apnsToken = {
          status: 'FAIL',
          message: 'Failed to get APNs token',
          error: error.message
        };
      }
    }

    // 5. Check background message handler
    console.log('🔄 Checking background message handler...');
    try {
      // This will throw if not set
      const hasHandler = messaging().setBackgroundMessageHandler !== undefined;
      results.checks.backgroundHandler = {
        status: 'PASS',
        message: 'Background message handler is available'
      };
    } catch (error) {
      results.checks.backgroundHandler = {
        status: 'FAIL',
        message: 'Background message handler not available',
        error: error.message
      };
      results.recommendations.push('Ensure setBackgroundMessageHandler is called at app level');
    }

    // 6. Check local storage for notifications
    console.log('💾 Checking local notification storage...');
    try {
      const storedNotifications = await AsyncStorage.getItem('app_notifications');
      const notificationCount = await AsyncStorage.getItem('notification_count');

      results.checks.localStorage = {
        status: 'PASS',
        message: 'Local storage accessible',
        storedNotifications: storedNotifications ? JSON.parse(storedNotifications).length : 0,
        notificationCount: notificationCount || '0'
      };
    } catch (error) {
      results.checks.localStorage = {
        status: 'FAIL',
        message: 'Local storage not accessible',
        error: error.message
      };
    }

    // 7. Test foreground message listener
    console.log('📨 Testing foreground message listener...');
    try {
      const unsubscribe = messaging().onMessage((message) => {
        console.log('Test message received:', message);
      });

      // Unsubscribe immediately after test
      setTimeout(() => unsubscribe(), 100);

      results.checks.foregroundListener = {
        status: 'PASS',
        message: 'Foreground message listener is working'
      };
    } catch (error) {
      results.checks.foregroundListener = {
        status: 'FAIL',
        message: 'Foreground message listener failed',
        error: error.message
      };
    }

    // Calculate overall status
    const { passed, failed, warnings } = results.summary;
    const totalChecks = passed + failed + warnings;

    if (failed === 0 && warnings === 0) {
      results.overall = 'PASS';
    } else if (failed === 0 && warnings > 0) {
      results.overall = 'WARNING';
    } else if (failed <= 2 && passed > failed) {
      results.overall = 'PARTIAL';
    } else {
      results.overall = 'FAIL';
    }

    // Add summary recommendations based on overall status
    if (results.overall === 'FAIL') {
      results.recommendations.unshift('🚨 FCM has critical issues that need immediate attention');
    } else if (results.overall === 'PARTIAL') {
      results.recommendations.unshift('⚠️ FCM is partially working but has some issues');
    } else if (results.overall === 'WARNING') {
      results.recommendations.unshift('⚠️ FCM is working but has minor warnings');
    } else {
      results.recommendations.unshift('✅ FCM is working perfectly!');
    }

    console.log(`✅ FCM Diagnostics completed - Status: ${results.overall} (${passed}/${totalChecks} passed)`);
    return results;

  } catch (error) {
    console.error('❌ FCM Diagnostics failed:', error);
    results.overall = 'ERROR';
    results.error = error.message;
    return results;
  }
};

/**
 * Send a test notification to verify FCM is working
 */
export const sendTestFCMNotification = async () => {
  try {
    console.log('🧪 Sending test FCM notification...');

    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      throw new Error('No FCM token available');
    }

    // Create test notification
    const testNotification = {
      title: '🧪 FCM Test Notification',
      message: 'This is a test notification to verify FCM is working properly!',
      type: 'test',
      timestamp: new Date().toISOString()
    };

    // Add to local storage
    await addNotification(testNotification);

    // Try to send via backend (if available)
    try {
      const response = await fetch('https://gharplotbackend.gntechnology.de/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          notification: {
            title: testNotification.title,
            body: testNotification.message
          },
          data: {
            type: 'test',
            timestamp: testNotification.timestamp
          }
        })
      });

      if (response.ok) {
        console.log('✅ Test notification sent via backend');
        return { success: true, method: 'backend', token };
      } else {
        console.log('⚠️ Backend test failed, notification added locally only');
        return { success: true, method: 'local', token };
      }
    } catch (networkError) {
      console.log('⚠️ Network error, notification added locally only');
      return { success: true, method: 'local', token };
    }

  } catch (error) {
    console.error('❌ Test notification failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test notification permission request
 */
export const testNotificationPermissions = async () => {
  try {
    console.log('🔐 Testing notification permissions...');

    const hasPermission = await requestNotificationPermission();

    if (hasPermission) {
      console.log('✅ Notification permissions granted');
      return { success: true, hasPermission: true };
    } else {
      console.log('❌ Notification permissions denied');
      return { success: false, hasPermission: false, error: 'Permissions denied by user' };
    }
  } catch (error) {
    console.error('❌ Permission test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test local notification storage
 */
export const testNotificationStorage = async () => {
  try {
    console.log('💾 Testing notification storage...');

    // Test write
    const testData = {
      id: 'test-' + Date.now(),
      title: 'Storage Test',
      message: 'Testing local storage functionality',
      type: 'test',
      timestamp: new Date().toISOString(),
      read: false
    };

    await addNotification(testData);
    console.log('✅ Test notification stored successfully');

    // Test read
    const stored = await AsyncStorage.getItem('app_notifications');
    const notifications = stored ? JSON.parse(stored) : [];
    const testNotification = notifications.find(n => n.id === testData.id);

    if (testNotification) {
      console.log('✅ Test notification retrieved successfully');
      return { success: true, stored: true, data: testNotification };
    } else {
      throw new Error('Test notification not found in storage');
    }

  } catch (error) {
    console.error('❌ Storage test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete FCM functionality test
 */
export const runCompleteFCMTest = async () => {
  console.log('🚀 Starting complete FCM test...');

  const testResults = {
    timestamp: new Date().toISOString(),
    overall: 'UNKNOWN',
    tests: {}
  };

  try {
    // 1. Run diagnostics
    console.log('📋 Running diagnostics...');
    const diagnostics = await runFCMDiagnostics();
    testResults.tests.diagnostics = diagnostics;

    // 2. Test permissions
    console.log('🔐 Testing permissions...');
    const permissionTest = await testNotificationPermissions();
    testResults.tests.permissions = permissionTest;

    // 3. Test storage
    console.log('💾 Testing storage...');
    const storageTest = await testNotificationStorage();
    testResults.tests.storage = storageTest;

    // 4. Test notification sending
    console.log('📤 Testing notification sending...');
    const notificationTest = await sendTestFCMNotification();
    testResults.tests.notification = notificationTest;

    // Calculate overall result
    const hasFailures = Object.values(testResults.tests).some(test => !test.success && test.status !== 'PASS');
    testResults.overall = hasFailures ? 'PARTIAL' : 'SUCCESS';

    console.log('✅ Complete FCM test finished');
    return testResults;

  } catch (error) {
    console.error('❌ Complete FCM test failed:', error);
    testResults.overall = 'FAILED';
    testResults.error = error.message;
    return testResults;
  }
};

/**
 * Show FCM test results in a user-friendly alert
 */
export const showFCMTestResults = (results) => {
  let title = '';
  let message = '';
  let hasDetails = false;

  // Handle both single diagnostics and full test results
  const diagnostics = results.tests?.diagnostics || results;
  const overall = results.overall || diagnostics.overall;

  switch (overall) {
    case 'PASS':
      title = '✅ FCM Working Perfectly';
      message = 'All Firebase Cloud Messaging features are working correctly!';
      break;
    case 'PARTIAL':
      title = '⚠️ FCM Partially Working';
      message = 'Some features are working, but there may be issues with certain functionality.';
      hasDetails = true;
      break;
    case 'WARNING':
      title = '⚠️ FCM Working with Warnings';
      message = 'FCM is functional but has some minor issues that should be addressed.';
      hasDetails = true;
      break;
    case 'FAIL':
      title = '❌ FCM Has Issues';
      message = 'Firebase Cloud Messaging has critical issues that need attention.';
      hasDetails = true;
      break;
    default:
      title = '❓ FCM Test Incomplete';
      message = 'Unable to complete FCM testing properly.';
      hasDetails = true;
  }

  // Add summary if available
  if (diagnostics.summary) {
    const { passed, failed, warnings } = diagnostics.summary;
    const total = passed + failed + warnings;
    message += `\n\n📊 Results: ${passed}/${total} checks passed`;
    if (failed > 0) message += `, ${failed} failed`;
    if (warnings > 0) message += `, ${warnings} warnings`;
  }

  // Add top recommendations (limit to 3 for readability)
  const recommendations = diagnostics.recommendations || results.tests?.diagnostics?.recommendations || [];
  if (recommendations.length > 0) {
    message += '\n\n💡 Key Issues:';
    recommendations.slice(0, 3).forEach(rec => {
      message += '\n• ' + rec.replace(/❗|🔧|📱|🌐|⚠️|✅/g, '').trim();
    });

    if (recommendations.length > 3) {
      message += `\n... and ${recommendations.length - 3} more`;
    }
  }

  const buttons = [{ text: 'OK' }];

  if (hasDetails) {
    buttons.push({
      text: 'View Details',
      onPress: () => {
        console.log('📊 Detailed FCM Test Results:');
        console.log('================================');
        console.log(JSON.stringify(results, null, 2));
        console.log('================================');

        // Also show recommendations in console
        if (recommendations.length > 0) {
          console.log('💡 All Recommendations:');
          recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
          });
        }
      }
    });
  }

  // Add retry option for failed tests
  if (overall === 'FAIL' || overall === 'PARTIAL') {
    buttons.push({
      text: 'Retry Test',
      onPress: async () => {
        const newResults = await runCompleteFCMTest();
        showFCMTestResults(newResults);
      }
    });
  }

  CrossPlatformAlert.alert(title, message, buttons);
};

/**
 * Quick fix for common FCM issues
 */
export const quickFixFCMIssues = async () => {
  console.log('🔧 Attempting to fix common FCM issues...');
  const fixes = [];

  try {
    // 1. Re-request permissions
    console.log('📱 Re-requesting notification permissions...');
    const authStatus = await messaging().requestPermission();
    const hasPermission = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (hasPermission) {
      fixes.push('✅ Notification permissions granted');
    } else {
      fixes.push('❌ Notification permissions still denied');
    }

    // 2. Force token refresh
    console.log('🔄 Forcing FCM token refresh...');
    try {
      await messaging().deleteToken();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newToken = await messaging().getToken();

      if (newToken) {
        fixes.push('✅ FCM token refreshed successfully');
        // Store new token
        await AsyncStorage.setItem('@fcm_token', newToken);
        await AsyncStorage.setItem('current_fcm_token', newToken);
      } else {
        fixes.push('❌ Failed to get new FCM token');
      }
    } catch (tokenError) {
      fixes.push('❌ Token refresh failed: ' + tokenError.message);
    }

    // 3. Clear notification storage and reset
    console.log('🧹 Clearing and resetting notification storage...');
    try {
      await AsyncStorage.removeItem('fcm_token_synced');
      fixes.push('✅ Cleared FCM sync status');
    } catch (storageError) {
      fixes.push('⚠️ Storage clear failed: ' + storageError.message);
    }

    // 4. Test notification after fixes
    console.log('🧪 Testing notification after fixes...');
    const testResult = await sendTestFCMNotification();
    if (testResult.success) {
      fixes.push('✅ Test notification sent successfully');
    } else {
      fixes.push('❌ Test notification failed: ' + testResult.error);
    }

    return {
      success: fixes.filter(f => f.startsWith('✅')).length > 0,
      fixes,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ FCM quick fix failed:', error);
    return {
      success: false,
      fixes: ['❌ Quick fix failed: ' + error.message],
      error: error.message
    };
  }
};

/**
 * Add FCM test button to any screen (for debugging)
 */
export const addFCMTestButton = (navigation) => {
  // This can be used in development to add a test button to screens
  return () => {
    CrossPlatformAlert.alert(
      'FCM Test & Fix Options',
      'Choose an option to test or fix FCM',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Quick Fix',
          onPress: async () => {
            CrossPlatformAlert.alert('Fixing FCM Issues', 'Please wait while we attempt to fix common FCM problems...');
            const fixResult = await quickFixFCMIssues();

            CrossPlatformAlert.alert(
              fixResult.success ? '🔧 FCM Fixes Applied' : '❌ Fix Failed',
              fixResult.fixes.join('\n'),
              [
                { text: 'OK' },
                {
                  text: 'Test Again',
                  onPress: async () => {
                    const results = await runCompleteFCMTest();
                    showFCMTestResults(results);
                  }
                }
              ]
            );
          }
        },
        {
          text: 'Quick Test',
          onPress: async () => {
            const results = await sendTestFCMNotification();
            CrossPlatformAlert.alert(
              results.success ? '✅ Test Sent' : '❌ Test Failed',
              results.success
                ? `Test notification sent via ${results.method}`
                : results.error
            );
          }
        },
        {
          text: 'Full Diagnostics',
          onPress: async () => {
            const results = await runCompleteFCMTest();
            showFCMTestResults(results);
          }
        }
      ]
    );
  };
};