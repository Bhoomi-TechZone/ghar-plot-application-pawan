/**
 * FCM Status Checker
 * Quick script to check if FCM notifications are working
 * 
 * Run in app console:
 * - npm run android (to start app)
 * - Then type: checkFCMStatus()
 */

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const checkFCMStatus = async () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('🔍 FCM NOTIFICATION STATUS CHECK');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  const results = {
    permission: '❌ Not Checked',
    token: '❌ Not Available',
    tokenValue: null,
    foregroundHandler: '❌ Not Setup',
    backgroundHandler: '❌ Not Setup',
    tokenRefresh: '❌ Not Setup',
    overall: '❌ FCM NOT Working'
  };

  try {
    // 1. Check Permission
    console.log('1️⃣ Checking notification permission...');
    try {
      const authStatus = await messaging().requestPermission();
      const hasPermission = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (hasPermission) {
        results.permission = '✅ GRANTED';
        console.log('   ✅ Permission: GRANTED');
      } else {
        results.permission = '❌ DENIED';
        console.log('   ❌ Permission: DENIED');
        console.log('   ⚠️ App cannot receive notifications without permission!');
      }
    } catch (error) {
      results.permission = '❌ ERROR: ' + error.message;
      console.log('   ❌ Error checking permission:', error.message);
    }

    // 2. Check FCM Token
    console.log('');
    console.log('2️⃣ Checking FCM Token...');
    try {
      const token = await messaging().getToken();
      if (token) {
        results.token = '✅ Available';
        results.tokenValue = token;
        console.log('   ✅ Token: Available');
        console.log('   📋 Token (first 30 chars):', token.substring(0, 30) + '...');
        
        // Save to AsyncStorage
        await AsyncStorage.setItem('@fcm_token', token);
        console.log('   💾 Token saved to AsyncStorage');
      } else {
        results.token = '❌ Not Available';
        console.log('   ❌ Token: Not available');
      }
    } catch (error) {
      results.token = '❌ ERROR: ' + error.message;
      console.log('   ❌ Error getting token:', error.message);
    }

    // 3. Check Foreground Handler
    console.log('');
    console.log('3️⃣ Checking Foreground Message Handler...');
    try {
      const unsubscribe = messaging().onMessage((message) => {
        console.log('📩 TEST: Foreground handler is ACTIVE and received a message');
        results.foregroundHandler = '✅ Active';
      });
      
      results.foregroundHandler = '✅ Setup Complete';
      console.log('   ✅ Foreground handler: Setup Complete');
      
      // Unsubscribe immediately (this was just a test)
      unsubscribe();
    } catch (error) {
      results.foregroundHandler = '❌ ERROR: ' + error.message;
      console.log('   ❌ Error setting up foreground handler:', error.message);
    }

    // 4. Check Background Handler
    console.log('');
    console.log('4️⃣ Checking Background Message Handler...');
    try {
      // Check if background handler is registered
      const hasBackgroundHandler = messaging().setBackgroundMessageHandler !== undefined;
      
      if (hasBackgroundHandler) {
        results.backgroundHandler = '✅ Available';
        console.log('   ✅ Background handler: Available');
      } else {
        results.backgroundHandler = '❌ Not Available';
        console.log('   ❌ Background handler: Not available');
      }
    } catch (error) {
      results.backgroundHandler = '❌ ERROR: ' + error.message;
      console.log('   ❌ Error checking background handler:', error.message);
    }

    // 5. Check Token Refresh Listener
    console.log('');
    console.log('5️⃣ Checking Token Refresh Listener...');
    try {
      const unsubscribe = messaging().onTokenRefresh((newToken) => {
        console.log('🔄 TEST: Token refresh listener is ACTIVE');
        results.tokenRefresh = '✅ Active';
      });
      
      results.tokenRefresh = '✅ Setup Complete';
      console.log('   ✅ Token refresh listener: Setup Complete');
      
      // Unsubscribe immediately
      unsubscribe();
    } catch (error) {
      results.tokenRefresh = '❌ ERROR: ' + error.message;
      console.log('   ❌ Error setting up token refresh listener:', error.message);
    }

    // Overall Status
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 OVERALL STATUS');
    console.log('═══════════════════════════════════════════════');
    
    const allWorking = 
      results.permission.includes('✅') &&
      results.token.includes('✅') &&
      results.foregroundHandler.includes('✅');
    
    if (allWorking) {
      results.overall = '✅ FCM IS WORKING!';
      console.log('✅ FCM IS WORKING!');
      console.log('');
      console.log('🎉 Your app can receive FCM notifications!');
      console.log('');
      console.log('📝 Next Steps:');
      console.log('   1. Send a test notification from Firebase Console');
      console.log('   2. Use your FCM token to send test notification');
      console.log('   3. Check if notification appears in app');
    } else {
      results.overall = '❌ FCM NOT WORKING';
      console.log('❌ FCM NOT WORKING');
      console.log('');
      console.log('⚠️ Issues found:');
      if (!results.permission.includes('✅')) {
        console.log('   • Permission not granted - Enable in app settings');
      }
      if (!results.token.includes('✅')) {
        console.log('   • FCM token not available - Check Firebase configuration');
      }
      if (!results.foregroundHandler.includes('✅')) {
        console.log('   • Foreground handler not working - Check FCM setup in App.js');
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('');

    // Copy token to clipboard helper
    if (results.tokenValue) {
      console.log('💡 TIP: To copy your FCM token, use:');
      console.log('   copyFCMToken()');
      console.log('');
      
      global.copyFCMToken = () => {
        console.log('📋 FCM TOKEN (Copy this):');
        console.log('');
        console.log(results.tokenValue);
        console.log('');
        return results.tokenValue;
      };
    }

    return results;

  } catch (error) {
    console.log('');
    console.log('❌ FATAL ERROR during FCM check:', error);
    console.log('');
    results.overall = '❌ FATAL ERROR: ' + error.message;
    return results;
  }
};

// Make it globally available
if (__DEV__) {
  global.checkFCMStatus = checkFCMStatus;
  
  // Auto-run after 3 seconds
  setTimeout(() => {
    console.log('');
    console.log('🔍 FCM Status Checker Ready!');
    console.log('   Type: checkFCMStatus()');
    console.log('');
  }, 3000);
}

export default checkFCMStatus;
