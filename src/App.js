import React, { useEffect, useRef } from 'react';
import { Platform, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './navigation/AppNavigator';
import WebAlertProvider from './components/WebAlertProvider';

// Import FCM debug helper in development mode (only for mobile platforms)
if (__DEV__ && Platform.OS !== 'web') {
  try {
    import('./utils/fcmDebugHelper').catch(error => {
      console.warn('⚠️ FCM debug helper not available:', error.message);
    });
  } catch (e) {
    console.warn('⚠️ FCM debug helper import failed:', e.message);
  }
}

const App = () => {
  const navigationRef = useRef();

  useEffect(() => {
    let fcmCleanup = null;

    // Initialize Firebase Cloud Messaging only for mobile platforms
    const setupFCM = async () => {
      // Skip FCM setup for web platform
      if (Platform.OS === 'web') {
        console.log('🌐 Running on web platform, skipping FCM setup');
        return;
      }

      try {
        console.log('🚀 Starting FCM setup in App.js...');

        // Import services dynamically to avoid require() issues
        const { initializeFCM, forceRefreshFCMToken } = await import('./utils/fcmService');
        const { addNotification } = await import('./utils/notificationManager');
        const { handleNotificationAction } = await import('./services/notificationService');

        // Check if we need to refresh token (one-time after Firebase project change)
        // Change version number to force refresh when Firebase project changes
        const FCM_REFRESH_KEY = '@fcm_token_refreshed_v3_gharplot435ee';
        const hasRefreshed = await AsyncStorage.getItem(FCM_REFRESH_KEY);

        if (!hasRefreshed) {
          console.log('🔄 First run after Firebase change - forcing token refresh...');
          const newToken = await forceRefreshFCMToken();
          if (newToken) {
            console.log('✅ Fresh FCM token obtained:', newToken.substring(0, 30) + '...');
            await AsyncStorage.setItem(FCM_REFRESH_KEY, 'true');
          }
        }

        const result = await initializeFCM(
          // Callback for token refresh
          async (newToken) => {
            console.log('🔄 FCM Token refreshed in App.js:', newToken?.substring(0, 20) + '...');

            // Send updated token to backend
            try {
              const userId = await AsyncStorage.getItem('userId');

              if (userId && newToken) {
                // You can add your backend token update API call here
                console.log('📤 Should send updated FCM token to backend for user:', userId);
                // await sendTokenToBackend(userId, newToken);
              }
            } catch (syncError) {
              console.warn('⚠️ Token sync failed (non-critical):', syncError.message);
            }
          },

          // Callback for notification opened
          (notification) => {
            console.log('🔔 Notification opened in App.js:', notification);

            try {
              // Add notification to local storage for display in notification list
              if (notification && notification.notification) {
                addNotification({
                  type: notification.data?.type || 'system',
                  title: notification.notification.title,
                  message: notification.notification.body,
                  propertyId: notification.data?.propertyId,
                  chatId: notification.data?.chatId,
                  inquiryId: notification.data?.inquiryId,
                  image: notification.data?.image
                });
              }

              // If user tapped a reminder notification, register the popup
              const notifData = notification.data || {};
              if (notifData.type === 'employee_due_reminder') {
                console.log('✅ User tapped employee reminder notification. Setting popup flag.');
                AsyncStorage.setItem('pendingNotificationData', JSON.stringify({
                  ...notifData,
                  triggerReminderPopup: true,
                  timestamp: Date.now()
                })).catch(e => console.log('Failed to save popup flag:', e.message));

                // Avoid navigating away immediately so the popup can show
                return;
              }

              // Use notification service to handle navigation for other types
              if (navigationRef.current) {
                handleNotificationAction(notification.data || notification, navigationRef.current);
              }
            } catch (notificationError) {
              console.error('❌ Error handling opened notification:', notificationError);
            }
          }
        );

        if (result.configured && result.token) {
          console.log('✅ FCM initialized successfully with token:', result.token.substring(0, 20) + '...');

          // Store token locally for debugging
          await AsyncStorage.setItem('current_fcm_token', result.token);

        } else if (!result.configured) {
          console.warn('⚠️ FCM not properly configured:', result.error);
        } else {
          console.warn('⚠️ FCM configured but no token received');
        }

        fcmCleanup = result.cleanup;

      } catch (error) {
        console.error('❌ Error initializing FCM in App.js:', error);
      }
    };

    setupFCM();

    // Cleanup on unmount
    return () => {
      if (fcmCleanup) {
        fcmCleanup();
      }
    };
  }, []);

  // Error boundary for web
  try {
    return (
      <WebAlertProvider>
        <AppNavigator ref={navigationRef} />
      </WebAlertProvider>
    );
  } catch (error) {
    console.error('❌ Error rendering AppNavigator:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>
          ❌ Navigation Error
        </Text>
        <Text style={{ marginTop: 10, textAlign: 'center' }}>
          {error.message}
        </Text>
        <Text style={{ marginTop: 10, color: '#666', textAlign: 'center' }}>
          Platform: {Platform.OS}
        </Text>
      </View>
    );
  }
};

export default App;