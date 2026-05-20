/**
 * @format
 */

// CRITICAL: Import Reanimated fix FIRST before any other imports
import './src/utils/reanimatedFix';

import { AppRegistry, Platform } from 'react-native';

// Initialize HMR configuration (fixes HMRClient.setup() error)
import './src/utils/hmrConfig';

// Initialize worklets error handler
import './src/utils/workletsErrorHandler';

import App from './App';
import NotificationHandler from './src/services/NotificationHandler';

// ============================================
// GLOBAL BACKGROUND NOTIFICATION HANDLER
// ============================================
// Register as early as possible for maximum reliability in killed state
NotificationHandler.registerBackgroundHandler();

// ============================================
// APP REGISTRATION (MUST match MainActivity.kt)
// ============================================
const appName = 'Gharplot'; // Must match getMainComponentName() in MainActivity.kt

// ============================================
// FCM BACKGROUND HANDLER
// ============================================
// CRITICAL: Register at top-level for killed/quit state delivery.
// When app is killed, React components don't mount so initializeFCM() never runs.
// This must be here for FCM to deliver notifications in killed state.
if (Platform.OS !== 'web') {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    const { backgroundMessageHandler } = require('./src/utils/fcmService');

    messaging().setBackgroundMessageHandler(backgroundMessageHandler);
    console.log('✅ FCM background handler registered at top-level (index.js)');
  } catch (fcmError) {
    console.warn('⚠️ FCM setup failed in index.js:', fcmError.message);
  }
}

// Register the main App component
AppRegistry.registerComponent(appName, () => App);
