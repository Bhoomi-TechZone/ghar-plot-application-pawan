/**
 * NavigationService.js
 * Centralized navigation service using createNavigationContainerRef
 * Handles navigation from anywhere in the app, including notification callbacks
 */
import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

class NavigationService {
  /**
   * Navigate to any screen with params
   * @param {string} name - Screen name
   * @param {Object} params - Navigation parameters
   */
  static navigate(name, params = {}) {
    if (navigationRef.isReady()) {
      navigationRef.navigate(name, params);
      console.log(`✅ Navigated to: ${name}`, params);
    } else {
      console.warn('❌ Navigation not ready');
    }
  }

  /**
   * Navigate to nested screen (for tab/stack inside stack)
   * @param {string} navigatorName - Parent navigator name
   * @param {string} screenName - Target screen name
   * @param {Object} params - Screen parameters
   */
  static navigateNested(navigatorName, screenName, params = {}) {
    if (navigationRef.isReady()) {
      navigationRef.navigate(navigatorName, {
        screen: screenName,
        params: params
      });
      console.log(`✅ Navigated to: ${navigatorName} > ${screenName}`, params);
    } else {
      console.warn('❌ Navigation not ready for nested navigation');
    }
  }

  /**
   * Reset navigation stack to specific screen
   * @param {string} name - Screen name
   * @param {Object} params - Navigation parameters
   */
  static reset(name, params = {}) {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name, params }],
      });
      console.log(`✅ Reset navigation to: ${name}`, params);
    }
  }

  /**
   * Push to stack (for stack navigators)
   * @param {string} name - Screen name
   * @param {Object} params - Navigation parameters
   */
  static push(name, params = {}) {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.push(name, params));
      console.log(`✅ Pushed to stack: ${name}`, params);
    }
  }

  /**
   * Go back to previous screen
   */
  static goBack() {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
      console.log('✅ Navigated back');
    }
  }

  /**
   * Get current route name
   * @returns {string} Current route name
   */
  static getCurrentRouteName() {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute()?.name;
    }
    return null;
  }

  /**
   * Check if navigation is ready
   * @returns {boolean} Navigation ready status
   */
  static isReady() {
    return navigationRef.isReady();
  }

  /**
   * Wait for navigation to be ready with timeout
   * @param {number} timeout - Timeout in milliseconds (default: 10000)
   * @returns {Promise<boolean>} Promise that resolves when ready or timeout
   */
  static async waitForReady(timeout = 10000) {
    return new Promise((resolve) => {
      if (navigationRef.isReady()) {
        console.log('✅ Navigation already ready');
        resolve(true);
        return;
      }

      console.log('⏳ Waiting for navigation to be ready...');
      let timeoutId;
      let attempts = 0;
      const maxAttempts = timeout / 100;

      const checkReady = () => {
        attempts++;
        if (navigationRef.isReady()) {
          if (timeoutId) clearTimeout(timeoutId);
          console.log(`✅ Navigation became ready after ${attempts * 100}ms`);
          resolve(true);
        } else if (attempts >= maxAttempts) {
          console.warn(`⚠️ Navigation ready timeout after ${timeout}ms`);
          resolve(false);
        } else {
          setTimeout(checkReady, 100);
        }
      };

      // Start checking
      checkReady();
    });
  }

  /**
   * Navigate from notification data
   * Handles different screen types and nested navigation
   * @param {Object} notificationData - Data from notification payload
   */
  static async navigateFromNotification(notificationData) {
    try {
      const { 
        targetScreen, 
        enquiryId, 
        clientName, 
        reminderId, 
        navigationType,
        navigationData = {}
      } = notificationData;

      console.log('🔔 Navigating from notification:', {
        targetScreen,
        enquiryId,
        navigationType,
        navigationData
      });

      // First check if navigation is immediately ready
      if (navigationRef.isReady()) {
        console.log('✅ Navigation is ready immediately');
        return this.performNavigation(targetScreen, enquiryId, clientName, reminderId, navigationType);
      }

      // Wait for navigation to be ready with longer timeout
      console.log('⏳ Waiting for navigation to become ready...');
      const isReady = await this.waitForReady(15000); // Increased to 15 seconds
      
      if (!isReady) {
        console.warn('⚠️ Navigation still not ready after 15s, storing notification for later');
        
        // Store notification data for later processing instead of emergency navigation
        const notificationData = {
          targetScreen,
          enquiryId,
          clientName,
          reminderId,
          navigationData,
          timestamp: Date.now()
        };
        
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('retryNotificationNavigation', JSON.stringify(notificationData));
        return true; // Return true so it doesn't try emergency nav
      }

      // Navigation is ready, perform normal navigation
      return this.performNavigation(targetScreen, enquiryId, clientName, reminderId, navigationType, navigationData);

    } catch (error) {
      console.error('❌ Error in notification navigation:', error);
      return false;
    }
  }

  /**
   * Perform the actual navigation once ready
   */
  static performNavigation(targetScreen, enquiryId, clientName, reminderId, navigationType, navigationData = {}) {
    try {
      // Double check navigation is ready before performing navigation
      if (!navigationRef.isReady()) {
        console.warn('⚠️ Navigation not ready in performNavigation, storing for later');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        AsyncStorage.setItem('retryNotificationNavigation', JSON.stringify({
          targetScreen, enquiryId, clientName, reminderId, navigationData, timestamp: Date.now()
        }));
        return false;
      }

      // Small delay to ensure app is fully loaded
      setTimeout(() => {
        try {
          const params = {
            enquiryId,
            clientName,
            fromNotification: true,
            reminderId,
            timestamp: Date.now(),
            ...navigationData // Include additional navigation data
          };

          console.log('🎯 Performing navigation to:', targetScreen, 'with params:', params);

          switch (navigationType) {
            case 'nested':
              // Navigate to specific screen based on targetScreen
              if (targetScreen === 'EnquiriesScreen' || targetScreen === 'Enquiries') {
                // For reminder notifications, go directly to EnquiriesScreen via proper navigation stack
                navigationRef.navigate('CRMStack', {
                  screen: 'AdminTabs',
                  params: {
                    screen: 'EnquiriesTab',
                    params: {
                      screen: 'EnquiriesScreen',
                      params: {
                        ...params,
                        scrollToEnquiry: enquiryId,
                        fromNotification: true,
                        isReminderNotification: navigationData?.isReminderNotification || false,
                        highlightEnquiry: enquiryId
                      }
                    }
                  }
                });
              } else if (targetScreen === 'EnquiryDetails') {
                // Direct navigation to Enquiries screen (no AdminApp nesting)
                navigationRef.navigate('Enquiries', {
                  ...params,
                  scrollToEnquiry: enquiryId, // Highlight specific enquiry
                  showDetails: true // Auto-open details modal
                });
              } else {
                navigationRef.navigate('AdminApp', {
                  screen: 'AdminMainTabs',
                  params: {
                    screen: targetScreen,
                    params: params
                  }
                });
              }
              break;
              
            case 'stack':
              navigationRef.navigate('AdminApp', {
                screen: targetScreen,
                params: params
              });
              break;
              
            case 'reset':
              navigationRef.reset({
                index: 0,
                routes: [{ 
                  name: 'AdminApp', 
                  params: { screen: 'AdminMainTabs' }
                }]
              });
              break;
              
            default:
              // Default behavior - navigate based on target screen
              if (targetScreen === 'EnquiriesScreen' || targetScreen === 'Enquiries') {
                // For reminder notifications, go to EnquiriesScreen
                navigationRef.navigate('CRMStack', {
                  screen: 'AdminTabs', 
                  params: {
                    screen: 'EnquiriesTab',
                    params: {
                      screen: 'EnquiriesScreen',
                      params: {
                        ...params,
                        scrollToEnquiry: enquiryId,
                        fromNotification: true,
                        isReminderNotification: true,
                        highlightEnquiry: enquiryId
                      }
                    }
                  }
                });
              } else if (targetScreen === 'EnquiryDetails' || targetScreen === 'AllLeads') {
                navigationRef.navigate('Enquiries', {
                  ...params,
                  scrollToEnquiry: enquiryId,
                  showDetails: true
                });
              } else {
                navigationRef.navigate('AdminApp', {
                  screen: targetScreen,
                  params: params
                });
              }
          }
          console.log('✅ Navigation performed successfully');
        } catch (navError) {
          console.error('❌ Navigation error in timeout:', navError);
        }
      }, 500);
      
      return true;
    } catch (error) {
      console.error('❌ Error in performNavigation:', error);
      return false;
    }
  }

  /**
   * Emergency navigation when normal methods fail - DEPRECATED for safety
   * Instead, we store data for later processing
   */
  static async emergencyNavigation(targetScreen, enquiryId, clientName, reminderId) {
    try {
      console.log('🚨 Emergency navigation called - storing data for later retry');
      
      // Don't attempt navigation when ref is not ready - just store for later
      const notificationData = {
        targetScreen,
        enquiryId,
        clientName,
        reminderId,
        timestamp: Date.now()
      };
      
      // Store in AsyncStorage for later retry
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('retryNotificationNavigation', JSON.stringify(notificationData));
      console.log('💾 Notification data stored for later processing when navigation is ready');
      
    } catch (error) {
      console.warn('⚠️ Even emergency storage failed:', error.message);
    }
  }
}

export default NavigationService;
