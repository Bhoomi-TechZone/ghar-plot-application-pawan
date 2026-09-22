/**
 * FCM Debug Helper
 * Easy console commands to test FCM functionality
 */

import { runCompleteFCMTest, sendTestFCMNotification } from './fcmTestService';
import { getFCMToken } from './fcmService';
import { addNotification } from './notificationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Global FCM testing functions for console/debugging
 * You can call these from anywhere in your app or console
 */

// Quick FCM test - call this from console or any component
global.testFCM = async () => {
  console.log('🧪 Starting FCM Quick Test...');
  try {
    const result = await sendTestFCMNotification();
    console.log('📊 FCM Test Result:', result);
    return result;
  } catch (error) {
    console.error('❌ FCM Test Error:', error);
    return { success: false, error: error.message };
  }
};

// Full FCM diagnostics - comprehensive test
global.testFCMFull = async () => {
  console.log('🔍 Starting Full FCM Diagnostics...');
  try {
    const result = await runCompleteFCMTest();
    console.log('📊 Full FCM Test Results:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Full FCM Test Error:', error);
    return { success: false, error: error.message };
  }
};

// Get current FCM token
global.getFCMToken = async () => {
  console.log('🎫 Getting FCM Token...');
  try {
    const token = await getFCMToken();
    console.log('✅ FCM Token:', token);
    return token;
  } catch (error) {
    console.error('❌ Token Error:', error);
    return null;
  }
};

// Check FCM configuration
global.checkFCMConfig = async () => {
  console.log('⚙️ Checking FCM Configuration...');
  try {
    // Import here to avoid circular dependencies
    const { checkFCMConfiguration } = await import('./fcmService');
    const config = await checkFCMConfiguration();
    console.log('📋 FCM Configuration:', config);
    return config;
  } catch (error) {
    console.error('❌ Config Check Error:', error);
    return { configured: false, error: error.message };
  }
};

// Add test notification locally
global.addTestNotification = async () => {
  console.log('📝 Adding Test Notification...');
  try {
    const notification = {
      title: '🧪 Debug Test Notification',
      message: 'This is a test notification added via debug helper',
      type: 'test',
    };

    const result = await addNotification(notification);
    console.log('✅ Test Notification Added:', result);
    return result;
  } catch (error) {
    console.error('❌ Add Notification Error:', error);
    return null;
  }
};

// Check stored FCM token
global.checkStoredToken = async () => {
  console.log('💾 Checking Stored FCM Token...');
  try {
    const token = await AsyncStorage.getItem('@fcm_token');
    const currentToken = await AsyncStorage.getItem('current_fcm_token');

    console.log('📋 Stored Tokens:');
    console.log('  FCM Token Key:', token ? `${token.substring(0, 20)}...` : 'None');
    console.log('  Current Token:', currentToken ? `${currentToken.substring(0, 20)}...` : 'None');

    return { token, currentToken };
  } catch (error) {
    console.error('❌ Token Check Error:', error);
    return null;
  }
};

// Test backend notification (if endpoint exists)
global.testBackendNotification = async (customToken = null) => {
  console.log('🌐 Testing Backend Notification...');
  try {
    const token = customToken || await getFCMToken();
    if (!token) {
      throw new Error('No FCM token available');
    }

    const response = await fetch('https://gharplotbackend.gntechnology.de/api/test-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        notification: {
          title: '🌐 Backend Test Notification',
          body: 'Testing FCM from backend API'
        },
        data: {
          type: 'backend_test',
          timestamp: new Date().toISOString()
        }
      })
    });

    const result = await response.json();
    console.log('📤 Backend Test Result:', result);
    return result;

  } catch (error) {
    console.error('❌ Backend Test Error:', error);
    return { success: false, error: error.message };
  }
};

// Help function to show all available commands
global.fcmHelp = () => {
  console.log(`
🔥 FCM Debug Helper Commands:

📱 Basic Tests:
  testFCM()                    - Quick FCM test
  testFCMFull()               - Full FCM diagnostics
  addTestNotification()        - Add local test notification

🔧 Configuration:
  getFCMToken()               - Get current FCM token
  checkFCMConfig()            - Check FCM configuration
  checkStoredToken()          - Check stored tokens

🌐 Backend Tests:
  testBackendNotification()   - Test backend notification API
  testBackendNotification(token) - Test with specific token

📚 Usage Examples:
  // Quick test
  await testFCM()
  
  // Get token for backend testing
  const token = await getFCMToken()
  console.log('Token:', token)
  
  // Full diagnostics
  await testFCMFull()
  
  // Add local notification
  await addTestNotification()

Type fcmHelp() again to see this help.
  `);
};

// Show help on import
console.log('🔥 FCM Debug Helper loaded! Type fcmHelp() for available commands.');

export default {
  testFCM: global.testFCM,
  testFCMFull: global.testFCMFull,
  getFCMToken: global.getFCMToken,
  checkFCMConfig: global.checkFCMConfig,
  addTestNotification: global.addTestNotification,
  checkStoredToken: global.checkStoredToken,
  testBackendNotification: global.testBackendNotification,
  fcmHelp: global.fcmHelp
};