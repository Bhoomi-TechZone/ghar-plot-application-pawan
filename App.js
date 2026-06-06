import React, { useEffect, useRef, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, AppState, Platform, ActivityIndicator } from 'react-native';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import { Alert, Linking } from 'react-native';
import ReminderPopup from './src/crm/components/Reminders/ReminderPopup';
import EmployeeNotificationPopup from './src/components/EmployeeNotificationPopup';
import AdminNotificationPopup from './src/components/AdminNotificationPopup';
import { setShowPopupCallback } from './src/services/EmployeePopupManager';
import reminderManager from './src/crm/services/reminderManager';
import NavigationService, { navigationRef } from './src/services/NavigationService';
import useAppVersionCheck from './src/hooks/useAppVersionCheck';
import UpdateModal from './src/components/UpdateModal';

// ── Web: Remove default browser outline/border from TextInput ─────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input,textarea{outline:none!important;box-shadow:none!important;}input:focus,textarea:focus{outline:none!important;box-shadow:none!important;}';
  document.head.appendChild(style);
}

// ── Native-only imports (Android / iOS only) ──────────────────────────────────
// These modules depend on native code not available on web.
let initializeFCM = null;
let ReminderNotificationService = null;
let AlertNotificationService = null;
let NotificationHandler = null;
let notifee = { requestPermission: async () => ({}), createChannel: async () => { }, deleteChannel: async () => { }, getChannel: async () => null, onForegroundEvent: () => () => { }, openNotificationSettings: async () => { } };

if (Platform.OS !== 'web') {
  initializeFCM = require('./src/utils/fcmService').initializeFCM;
  ReminderNotificationService = require('./src/services/ReminderNotificationService').default;
  AlertNotificationService = require('./src/services/AlertNotificationService').default;
  NotificationHandler = require('./src/services/NotificationHandler').default;
  notifee = require('@notifee/react-native').default;
}

// Import FCM debug helper in development mode (native only)
if (__DEV__ && Platform.OS !== 'web') {
  import('./src/utils/fcmDebugHelper').catch(() => console.log('fcmDebugHelper not found'));
  import('./src/utils/fcmReminderTestHelper').catch(() => console.log('fcmReminderTestHelper not found'));
  // import('./test-notification-navigation'); // Temporarily disabled
  // import('./src/utils/testFCM'); // Temporarily disabled
  // import('./test-background-alert-navigation'); // Temporarily disabled
}

const AppMain = () => {
  const [currentReminder, setCurrentReminder] = useState(null);
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [appError, setAppError] = useState(null);
  const appStateRef = useRef(AppState.currentState);

  const { showUpdateModal, updateInfo, forceUpdate, handleLater, handleUpdate, isChecking } = useAppVersionCheck();

  // Employee Notification Popup State
  const [employeePopupVisible, setEmployeePopupVisible] = useState(false);
  const [employeePopupData, setEmployeePopupData] = useState(null);

  // Admin Notification Popup State
  const [adminPopupVisible, setAdminPopupVisible] = useState(false);
  const [adminPopupData, setAdminPopupData] = useState(null);

  // 🔥 CRITICAL: AppState listener to handle background -> foreground transition
  useEffect(() => {
    // 🔥 Track if we already processed this transition
    let isProcessingNavigation = false;

    const handleAppStateChange = async (nextAppState) => {
      console.log('📱 AppState changed from', appStateRef.current, 'to', nextAppState);

      // When app comes to FOREGROUND from BACKGROUND
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🎬 App came to FOREGROUND - Checking pending notifications');

        // 🔥 Prevent multiple processing
        if (isProcessingNavigation) {
          console.log('⚠️ Already processing navigation, skipping...');
          appStateRef.current = nextAppState;
          return;
        }

        isProcessingNavigation = true;

        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;

          const pendingData = await AsyncStorage.getItem('pendingNotificationData');

          if (pendingData) {
            const triggerData = JSON.parse(pendingData);
            console.log('📨 Found pending notification:', triggerData.navigateTo || 'Trigger Popup');

            // 🔥 NEW: Handle triggerReminderPopup flag
            if (triggerData.triggerReminderPopup) {
              console.log('🚀 TRIGGER POPUP - Processing now!');

              let attempts = 0;
              const maxAttempts = 20; // Increased to 10 seconds

              const waitAndTrigger = async () => {
                const navReady = navigationRef && navigationRef.isReady && navigationRef.isReady();
                const callbackReady = !!global.triggerProfessionalReminder;

                if (navReady && callbackReady) {
                  // 🔥 ONLY delete data after we are sure we can trigger it
                  await AsyncStorage.removeItem('pendingNotificationData');

                  console.log('✅ App ready, triggering popup for ID:', triggerData.data?.alertId || triggerData.data?.reminderId);

                  // Wrap in setTimeout to ensure UI thread is free before triggering heavy modal
                  setTimeout(() => {
                    global.triggerProfessionalReminder(triggerData.data || triggerData);
                  }, 0);

                  isProcessingNavigation = false;
                } else if (attempts < maxAttempts) {
                  console.log(`⏳ Waiting for app readiness (nav: ${navReady}, callback: ${callbackReady}). Attempt ${attempts + 1}`);
                  attempts++;
                  setTimeout(waitAndTrigger, 500);
                } else {
                  console.warn('❌ Failed to trigger popup after max attempts');
                  isProcessingNavigation = false;
                }
              };
              waitAndTrigger();
              return;
            }

            if (triggerData.shouldNavigateImmediately && triggerData.navigateTo && triggerData.navigationParams) {
              console.log('🚀 SINGLE NAVIGATION - Processing now!');

              // 🔥 Wait for navigation to be ready, then navigate ONCE
              const waitAndNavigate = async () => {
                if (navigationRef && navigationRef.isReady && navigationRef.isReady()) {
                  const currentRoute = navigationRef.getCurrentRoute();

                  // Skip if already on target screen
                  if (currentRoute?.name === triggerData.navigateTo) {
                    console.log('⚠️ Already on target screen');
                    await AsyncStorage.removeItem('pendingNotificationData');
                    isProcessingNavigation = false;
                    return;
                  }

                  console.log('📤 Navigating to:', triggerData.navigateTo);
                  await AsyncStorage.removeItem('pendingNotificationData');
                  navigationRef.navigate(triggerData.navigateTo, triggerData.navigationParams);
                  console.log('✅ Navigation done');

                  // Reset after successful navigation
                  setTimeout(() => { isProcessingNavigation = false; }, 3000);
                } else {
                  // Wait 500ms and try once more
                  setTimeout(async () => {
                    if (navigationRef && navigationRef.isReady && navigationRef.isReady()) {
                      await AsyncStorage.removeItem('pendingNotificationData');
                      navigationRef.navigate(triggerData.navigateTo, triggerData.navigationParams);
                      console.log('✅ Delayed navigation done');
                    }
                    isProcessingNavigation = false;
                  }, 500);
                }
              };

              waitAndNavigate();
            } else {
              isProcessingNavigation = false;
            }
          } else {
            isProcessingNavigation = false;
          }
        } catch (error) {
          console.error('❌ AppState navigation error:', error);
          isProcessingNavigation = false;
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let fcmCleanup = null;
    let unsubscribeNotificationPress = null;

    const initializeApp = async () => {
      try {
        console.log('🚀 Starting App initialization...');

        // ── Web platform: skip all native notification setup ──────────────────
        if (Platform.OS === 'web') {
          // Initialize reminder manager only (uses AsyncStorage, safe on web)
          try {
            await reminderManager.initialize(() => { });
            console.log('✅ [Web] Reminder Manager initialized');
          } catch (e) {
            console.warn('⚠️ [Web] Reminder Manager init failed:', e.message);
          }
          return;
        }

        // 🔔 Create notification channels + request permission at startup
        try {
          await notifee.requestPermission();
          // Delete old channels (might have been created without sound) and recreate with sound
          await notifee.deleteChannel('default_notification_channel').catch(() => { });
          await notifee.deleteChannel('enquiry_reminders').catch(() => { });
          await notifee.deleteChannel('gharplot_alerts').catch(() => { });
          await notifee.createChannel({
            id: 'default_notification_channel',
            name: 'Notifications',
            importance: 4, // IMPORTANCE_HIGH
            sound: 'default',
            vibration: true,
            vibrationPattern: [300, 500],
          });
          await notifee.createChannel({
            id: 'enquiry_reminders',
            name: 'Reminders',
            importance: 4,
            sound: 'default',
            vibration: true,
            vibrationPattern: [300, 500],
          });
          await notifee.createChannel({
            id: 'gharplot_alerts',
            name: 'Gharplot Alerts',
            importance: 4,
            sound: 'default',
            vibration: true,
            vibrationPattern: [300, 500],
          });
          console.log('✅ Notification channels recreated with sound + permission granted');

          // 🔔 IMPORTANT: Android stores app-level importance=DEFAULT permanently across reinstalls.
          // Only user can fix it via Android Settings → Apps → Gharplot → Notifications → set to HIGH.
          // We open the settings page once so user can fix it.
          const _AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const settingsPrompted = await _AsyncStorage.getItem('app_notif_settings_prompted_v3');
          if (!settingsPrompted) {
            const ch = await notifee.getChannel('default_notification_channel').catch(() => null);
            const needsFix = !ch || (ch.importance !== undefined && ch.importance < 4);
            if (needsFix) {
              await _AsyncStorage.setItem('app_notif_settings_prompted_v3', '1');
              Alert.alert(
                '🔔 Enable Alert Notifications',
                'Pop-up reminder notifications require HIGH importance.\n\nTap "Open Settings" → set Gharplot notifications to "High" or "Alert".',
                [
                  { text: 'Later', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => notifee.openNotificationSettings() },
                ],
                { cancelable: false }
              );
            }
          }
        } catch (channelErr) {
          console.log('⚠️ Channel/permission error (non-critical):', channelErr.message);
        }

        // Initialize Reminder Manager with error handling
        try {
          let lastTriggeredId = null;
          let lastTriggeredTime = 0;

          // Helper to normalize IDs for consistent deduplication
          const normalizeId = (id) => {
            if (!id) return null;
            return String(id).replace(/^(reminder_|alert_|notif_)/, '');
          };

          const triggerReminderPopup = (reminder) => {
            console.log('🚨🚨🚨 [DEBUG APP] triggerReminderPopup entry point with:', JSON.stringify({
              title: reminder?.title,
              name: reminder?.name,
              id: reminder?.reminderId || reminder?._id,
              type: reminder?.type || reminder?.notificationType
            }));

            const now = Date.now();
            const rawId = reminder.reminderId || reminder._id || reminder.id || reminder.alertId;
            const remId = normalizeId(rawId) || `rem_${now}`;

            // 🔥 Identify Type FIRST (Priority: Alert > Admin > Standard)
            const nType = String(reminder.type || reminder.notificationType || reminder.category || '').toLowerCase();
            const rAll = (
              nType + " " +
              String(reminder.title || reminder.reminderTitle || '') + " " +
              String(reminder.note || reminder.body || reminder.message || '') + " " +
              String(reminder.employeeName || reminder.senderName || reminder.name || '')
            ).toLowerCase();

            // 🎯 REFINED DETECTION: 
            // - Red Alert: If type is 'alert' OR title/body suggests danger/urgent (and NOT a reminder)
            const isActuallyAlert = nType === 'alert' || ((rAll.includes('alert') || rAll.includes('emergency') || rAll.includes('urgent')) && !rAll.includes('reminder'));

            // - Indigo Admin: Specifically tagged OR has Admin keywords (and NOT a red alert)
            const isActuallyAdmin = !isActuallyAlert && (rAll.includes('admin') || nType === 'admin_reminder' || !!reminder.alertId);

            // 🛑 DUAL-PATH BRIDGE CHECK: Only block if it's a REMINDER (to prevent dual popups).
            // ALERTS (Red) always bypass the bridge to guarantee visibility.
            if (!isActuallyAlert && remId && !remId.startsWith('rem_') && global.lastGlobalReminderId === remId && (now - global.lastGlobalReminderTime < 10000)) {
              console.log('🛑 Blocking dual-popup (Large Path): Already showing popup for ID:', remId);
              return;
            }

            // 🛑 LOCAL RAPID-TRIGGER LOCK: Skip only if it's a duplicate REMINDER.
            // (Standard alerts should almost always fire if they are fresh)
            if (!isActuallyAlert && remId && remId === lastTriggeredId && (now - lastTriggeredTime < 5000)) {
              console.log('🚨🚨🚨 [DEBUG APP] ⏭️ Skipping local duplicate REMINDER for ID:', remId);
              return;
            }

            // Global Lockout Bridge Update - Inform other components
            if (remId && !remId.startsWith('rem_')) {
              global.lastGlobalReminderId = remId;
              global.lastGlobalReminderTime = now;
            }

            lastTriggeredId = remId;
            lastTriggeredTime = now;

            // Prepare normalized data for display
            const normalizedReminder = {
              ...reminder,
              name: reminder.name || reminder.clientName || 'Gharplot Client',
              title: reminder.title || reminder.reminderTitle || (isActuallyAlert ? 'Alert' : 'Reminder'),
              note: reminder.note || reminder.body || reminder.message || 'Scheduled notification',
            };

            // 🔥 NEW: Navigation handler for 'Edit' button
            const handlePopupEdit = () => {
              console.log('✏️ Edit button pressed in popup for:', normalizedReminder.title);

              if (navigationRef.current) {
                const rawId = normalizedReminder.reminderId || normalizedReminder.alertId || normalizedReminder._id || normalizedReminder.id;
                const cleanId = normalizeId(rawId);
                const nType = String(normalizedReminder.type || normalizedReminder.notificationType || normalizedReminder.category || '').toLowerCase();

                // 🎯 Match NotificationHandler.js logic for Alerts/Admin reminders
                if (isActuallyAlert || nType === 'admin_reminder' || normalizedReminder.alertId) {
                  console.log('🚀 Navigating to EditAlert screen');
                  navigationRef.current.navigate('EditAlert', {
                    alertId: cleanId,
                    originalTitle: normalizedReminder.alertTitle || normalizedReminder.title || normalizedReminder.reminderTitle || 'Reminder',
                    originalReason: normalizedReminder.alertReason || normalizedReminder.reason || normalizedReminder.message || normalizedReminder.note || '',
                    originalDate: normalizedReminder.scheduledDate || normalizedReminder.date || normalizedReminder.reminderTime || '',
                    originalTime: normalizedReminder.scheduledTime || normalizedReminder.time || '',
                    repeatDaily: (normalizedReminder.repeatDaily === 'true' || normalizedReminder.repeatDaily === true || normalizedReminder.repeatFrequency === 'daily')
                  });
                } else if (nType === 'employee_reminder_to_admin') {
                  console.log('🚀 Navigating to AdminReminderDetailsScreen (Employee-to-Admin)');
                  navigationRef.current.navigate('AdminReminderDetailsScreen', {
                    reminderId: cleanId,
                    employeeName: normalizedReminder.employeeName || '',
                    employeeEmail: normalizedReminder.employeeEmail || '',
                    reminderTitle: normalizedReminder.reminderTitle || normalizedReminder.title || '',
                    clientName: normalizedReminder.clientName || '',
                    phone: normalizedReminder.phone || normalizedReminder.phoneNumber || '',
                    location: normalizedReminder.location || '',
                    note: normalizedReminder.note || normalizedReminder.comment || normalizedReminder.message || '',
                    reminderTime: normalizedReminder.reminderTime || normalizedReminder.scheduledDate || normalizedReminder.timestamp || '',
                    enquiryId: normalizedReminder.enquiryId,
                    fromNotification: true
                  });
                } else {
                  // Standard Employee Reminder
                  console.log('🚀 Navigating to EmployeeReminderDetailsScreen');
                  navigationRef.current.navigate('EmployeeReminderDetailsScreen', {
                    reminderId: cleanId,
                    clientName: normalizedReminder.clientName || normalizedReminder.title || '',
                    originalMessage: normalizedReminder.message || normalizedReminder.comment || normalizedReminder.note || '',
                    enquiryId: normalizedReminder.enquiryId,
                    fromNotification: true,
                    phone: normalizedReminder.phone || normalizedReminder.phoneNumber || normalizedReminder.contactNumber || '',
                    email: normalizedReminder.email || '',
                    location: normalizedReminder.location || '',
                    reminderTime: normalizedReminder.reminderTime || normalizedReminder.scheduledDate || normalizedReminder.scheduledTime || (normalizedReminder.date && normalizedReminder.time ? `${normalizedReminder.date} ${normalizedReminder.time}` : (normalizedReminder.date || normalizedReminder.time || '')),
                    isRepeating: normalizedReminder.isRepeating === 'true' || normalizedReminder.isRepeating === true,
                    repeatType: normalizedReminder.repeatType || 'none',
                  });
                }
              } else {
                console.warn('⚠️ Navigation ref not ready for edit action');
              }
            };

            if (isActuallyAdmin) {
              console.log('🚨🚨🚨 [DEBUG APP] 🔔 SHOWING ADMIN POPUP NOW:', normalizedReminder.title);
              setAdminPopupData({ ...normalizedReminder, onEdit: handlePopupEdit });
              setAdminPopupVisible(true);
            } else if (isActuallyAlert) {
              console.log('🚨🚨🚨 [DEBUG APP] 🔔 SHOWING RED ALERT POPUP NOW:', normalizedReminder.title);
              setEmployeePopupData({ ...normalizedReminder, onEdit: handlePopupEdit });
              setEmployeePopupVisible(true);
            } else {
              console.log('🚨🚨🚨 [DEBUG APP] 🔔 SHOWING STANDARD REMINDER POPUP NOW:', normalizedReminder.title);
              setCurrentReminder({ ...normalizedReminder, onEdit: handlePopupEdit });
              setShowReminderPopup(true);
            }
          };


          // Expose globally for fcmService.js to use
          global.triggerProfessionalReminder = triggerReminderPopup;

          // 🔥 NEW: Improved Popup Manager Callback with global lockout check
          setShowPopupCallback((data) => {
            const now = Date.now();
            const rawId = data.reminderId || data.id || data._id || data.alertId;
            const notificationId = normalizeId(rawId);

            // 🔥 Identify Type FIRST (Priority: Alert > Admin > Standard)
            const rType = String(data.type || data.notificationType || data.category || '').toLowerCase();
            const rTitle = String(data.title || data.reminderTitle || '').toLowerCase();
            const rNote = String(data.note || data.body || data.message || data.reason || '').toLowerCase();
            const rAll = (rType + " " + rTitle + " " + rNote).toLowerCase();

            const isActuallyAlert = rAll.includes('alert') || rAll.includes('emergency') || rAll.includes('urgent');
            const isActuallyAdmin = !isActuallyAlert && (rAll.includes('admin') || rType === 'admin_reminder');

            // BRIDGE CHECK: Only block if it's a REMINDER (to avoid dual Indigo-Indigo popups).
            // ALERTS (Red) should always show if they are fresh.
            if (!isActuallyAlert && notificationId && global.lastGlobalReminderId === notificationId && (now - global.lastGlobalReminderTime < 10000)) {
              console.log('🛑 Blocking duplicate Admin/Reminder popup (Bridge):', notificationId);
              return;
            }

            if (isActuallyAdmin) {
              setAdminPopupData(data);
              setAdminPopupVisible(true);
            } else {
              setEmployeePopupData(data);
              setEmployeePopupVisible(true);
            }
          });

          await reminderManager.initialize(triggerReminderPopup);
          console.log('✅ Reminder Manager initialized');

          // 🔥 NEW: Setup Socket listener for 'employeeDueReminder'
          const setupSocketListener = async () => {
            try {
              const { initializeSocket } = require('./src/utils/socketService');
              const _AsyncStorage = require('@react-native-async-storage/async-storage').default;

              const socket = await initializeSocket();
              const userId = await _AsyncStorage.getItem('userId');

              if (socket && userId) {
                console.log('📡 Setting up employeeDueReminder socket listener for user:', userId);

                // Remove existing to avoid duplicates
                socket.off('employeeDueReminder');

                socket.on('employeeDueReminder', (data) => {
                  console.log('📡 Socket: employeeDueReminder received', data.title || data.reminderTitle);

                  // Extract IDs safely
                  const notifEmpId = String(data.employeeId?._id || data.employeeId || '');
                  const currentUserId = String(userId || '');

                  // Filter by userId to ensure only the assignee gets the popup
                  if (notifEmpId && currentUserId && notifEmpId === currentUserId) {
                    console.log('✅ Matches current user - triggering popup');
                    triggerReminderPopup(data);
                  } else {
                    console.log('⏭️ Skipping: Reminder for another user or ID mismatch');
                  }
                });
              }
            } catch (e) { console.log('⚠️ Socket listener setup failed:', e.message); }
          };
          setupSocketListener();

        } catch (reminderError) {
          console.error('❌ Reminder Manager initialization failed:', reminderError);
          // Continue app startup even if reminder manager fails
        }

        // 🔔 Initialize ReminderNotificationService for background notifications
        const initializeNotifications = async () => {
          try {
            // 🔥 Check if this is first-time setup
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const isFirstLaunch = await AsyncStorage.getItem('app_first_launch');

            if (isFirstLaunch === null) {
              console.log('🎉 First time app launch - Requesting all permissions...');
              await AsyncStorage.setItem('app_first_launch', 'false');

              // 🔥 Request all permissions at once on first launch
              try {
                await ReminderNotificationService.requestNotificationPermissions();
                console.log('✅ All permissions requested on first launch');
              } catch (permError) {
                console.warn('⚠️ Permission request failed:', permError);
              }
            }

            console.log('🚀 Initializing ReminderNotificationService...');
            const initialized = await ReminderNotificationService.initialize();
            if (initialized) {
              console.log('✅ ReminderNotificationService ready for background reminders');

              // 🔥 Show permission status after initialization
              const permStatus = await ReminderNotificationService.getNotificationPermissionStatus();
              console.log('📊 Permission Status:', permStatus);

              if (permStatus && !permStatus.canScheduleExactAlarms) {
                console.warn('⚠️ WARNING: Cannot schedule exact alarms - Background notifications may not work!');
                console.warn('📱 User needs to grant "Alarms & reminders" permission in app settings');
              }
            } else {
              console.warn('⚠️ Failed to initialize notification service');
            }

            // Also initialize AlertNotificationService
            console.log('🚀 Initializing AlertNotificationService...');
            const alertInitialized = await AlertNotificationService.initialize();
            if (alertInitialized) {
              console.log('✅ AlertNotificationService ready for system alerts');
            } else {
              console.warn('⚠️ Failed to initialize alert notification service');
            }
          } catch (error) {
            console.error('❌ Notification service initialization error:', error);
            // Don't crash the app for notification service failures
          }
        };

        // Initialize notifications
        await initializeNotifications();

        // 🔔 Handle notification press events with proper navigation
        const setupNotificationListeners = () => {
          try {
            // Setup all notification listeners (foreground, background, killed)
            const listener = NotificationHandler.setupNotificationListeners(
              navigationRef, // Still pass ref for compatibility
              (notification) => {
                console.log('📱 Notification received in App:', notification);
              }
            );
            console.log('✅ Notification listeners setup complete');
            return listener;
          } catch (listenerError) {
            console.error('❌ Notification listener setup failed:', listenerError);
            return null; // Return null instead of crashing
          }
        };

        // Setup notification listeners
        unsubscribeNotificationPress = setupNotificationListeners();

        // 🎯 CRITICAL: Setup direct background notification tap handler
        // 🔥 NOTE: Notifee already handles background events - FCM handler is BACKUP only
        const setupBackgroundTapHandler = () => {
          try {
            const messaging = require('@react-native-firebase/messaging').default;
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;

            // Handle notification tap when app is in BACKGROUND (Firebase FCM)
            // 🔥 This is a BACKUP - Notifee's onBackgroundEvent should handle most cases
            const unsubscribe = messaging().onNotificationOpenedApp(async remoteMessage => {
              console.log('🔔🔔 BACKGROUND TAP (FCM) - Notification opened:', JSON.stringify(remoteMessage, null, 2));

              const notifType = remoteMessage.data?.type || remoteMessage.data?.notificationType;
              console.log('🎯 Notification Type:', notifType);

              // 🔥 SKIP reminder/alert - Notifee handles these
              if (notifType === 'reminder' || notifType === 'enquiry_reminder') {
                console.log('⏭️ SKIPPING FCM handler for reminder - Notifee will handle');
                return;
              }

              // 🔥 Check if Notifee already stored this notification
              const existingData = await AsyncStorage.getItem('pendingNotificationData');
              if (existingData) {
                console.log('⚠️ Notifee already stored data, skipping FCM handler');
                return;
              }

              if (notifType === 'alert' || notifType === 'system_alert') {
                console.log('🚀🚀🚀 ALERT DETECTED (FCM BACKUP) - Storing for navigation');

                const params = {
                  alertId: remoteMessage.data.alertId?.replace('alert_', '') || remoteMessage.data.alertId || Date.now().toString(),
                  originalReason: remoteMessage.data.reason || remoteMessage.notification?.body || '',
                  originalDate: remoteMessage.data.date,
                  originalTime: remoteMessage.data.time,
                  repeatDaily: remoteMessage.data.repeatDaily === 'true' || remoteMessage.data.repeatDaily === true
                };

                console.log('📤 Storing alert for navigation:', params);

                // Store for immediate navigation when app comes to foreground
                const notificationData = {
                  id: remoteMessage.messageId,
                  data: remoteMessage.data,
                  timestamp: new Date().toISOString(),
                  shouldNavigateImmediately: true,
                  navigateTo: 'EditAlert',
                  navigationParams: params
                };

                AsyncStorage.setItem('pendingNotificationData', JSON.stringify(notificationData))
                  .then(() => console.log('✅ Alert stored in AsyncStorage'))
                  .catch(err => console.error('❌ Failed to store alert:', err));
              }
              // 🔥 Reminder handling REMOVED - Notifee handles it to prevent duplicate
            });

            console.log('✅ Background tap handler registered successfully');
            return unsubscribe;
          } catch (error) {
            console.error('❌ Background tap handler setup failed:', error);
          }
        };

        // Setup background tap handler
        console.log('✅ Background tap handler setup complete (Killed state handled by SplashScreen)');
        setupBackgroundTapHandler();

        // FCM is initialized separately after initializeApp — do NOT call setupFCM() here
        // (setupFCM is called once below, after its definition, to avoid registering duplicate onMessage handlers)
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setAppError(error.message || 'App initialization failed');
      }
    };

    initializeApp();

    // ✅ ENHANCED: Debug commands for App level reminder testing
    if (__DEV__) {
      global.debugAppReminders = {
        // Test popup immediately with mock reminder
        testPopupNow: () => {
          const mockReminder = {
            id: 'test-popup-' + Date.now(),
            title: '🧪 Test Popup',
            note: 'This is a test popup for debugging the reminder system',
            name: 'Test Client',
            phone: '9999999999',
            contactNumber: '9999999999',
            location: 'Test Location',
            reminderDateTime: new Date().toISOString(),
            status: 'pending',
            assignmentType: 'enquiry',
            productType: 'Residential',
            caseStatus: 'Open',
            source: 'Test',
            clientCode: 'CC999',
            projectCode: 'PC999',
            serialNumber: '999'
          };

          setCurrentReminder(mockReminder);
          setShowReminderPopup(true);
          console.log('🧪 Test popup triggered manually');
          return 'Test popup shown';
        },

        // Check if popup is working
        checkPopup: () => {
          console.log('🔍 Popup State:');
          console.log('  Show popup:', showReminderPopup);
          console.log('  Current reminder:', currentReminder?.title || 'None');
          return {
            showPopup: showReminderPopup,
            reminder: currentReminder?.title || 'None'
          };
        },

        // Force close popup
        closePopup: () => {
          setShowReminderPopup(false);
          setCurrentReminder(null);
          console.log('🚪 Popup manually closed');
          return 'Popup closed';
        }
      };

      setTimeout(() => {
        console.log('🛠️ App Level Debug Commands Available:');
        console.log('  • global.debugAppReminders.testPopupNow() - Show test popup immediately');
        console.log('  • global.debugAppReminders.checkPopup() - Check popup state');
        console.log('  • global.debugAppReminders.closePopup() - Force close popup');
        console.log('');
        console.log('📱 Combined with ReminderManager debug commands for complete testing');
      }, 4000);
    }

    // Initialize Firebase Cloud Messaging (native only)
    const setupFCM = async () => {
      // FCM is not available on web
      if (Platform.OS === 'web' || !initializeFCM) {
        console.log('🌐 [Web] Skipping FCM setup');
        return;
      }

      try {
        console.log('🚀 Starting FCM setup in App.js...');

        const result = await initializeFCM(
          // Callback for token refresh
          async (newToken) => {
            console.log('🔄 FCM Token refreshed in App.js:', newToken?.substring(0, 20) + '...');

            // Send updated token to backend
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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
              const { addNotification } = require('./src/utils/notificationManager');
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

              // Use notification service to handle navigation
              if (navigationRef.current) {
                const { handleNotificationAction } = require('./src/services/notificationService');
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
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('current_fcm_token', result.token);

        } else if (!result.configured) {
          console.warn('⚠️ FCM not properly configured:', result.error);
        } else {
          console.warn('⚠️ FCM configured but no token received');
        }

        fcmCleanup = result.cleanup;

      } catch (error) {
        console.warn('⚠️ FCM initialization failed (non-critical):', error.message);

        // Don't show alerts in production - only log the issue
        if (__DEV__) {
          setTimeout(() => {
            console.log('FCM Error Details:', {
              message: error.message,
              stack: error.stack?.substring(0, 200)
            });
          }, 1000);
        }

        // Continue app startup even if FCM fails
        fcmCleanup = () => { }; // No-op cleanup function
      }
    };

    setupFCM();

    // Cleanup on unmount
    return () => {
      try {
        if (fcmCleanup && typeof fcmCleanup === 'function') {
          fcmCleanup();
        }
        if (unsubscribeNotificationPress && typeof unsubscribeNotificationPress === 'function') {
          unsubscribeNotificationPress();
        }
        if (reminderManager && reminderManager.stopChecking) {
          reminderManager.stopChecking();
        }
        console.log('✅ App cleanup completed');
      } catch (cleanupError) {
        console.error('❌ Error during app cleanup:', cleanupError);
        // Don't throw error during cleanup
      }
    };
  }, [currentReminder?.title, showReminderPopup]);

  const handleReminderClose = async (response) => {
    try {
      if (currentReminder && response) {
        await reminderManager.markAsCompleted(currentReminder.id, response);
      }
      setShowReminderPopup(false);
      setCurrentReminder(null);
    } catch (error) {
      console.error('❌ Error closing reminder:', error);
      // Still close the popup even if marking as completed fails
      setShowReminderPopup(false);
      setCurrentReminder(null);
    }
  };

  // Handle navigation ready - process pending notifications
  const onNavigationReady = async () => {
    console.log('✅ Navigation is ready');

    // 🔥 CRITICAL: Set global navigationRef for Notifee background handler
    global.navigationRef = navigationRef;
    console.log('✅ Global navigationRef set for background notifications');

    // Process any pending notification from killed state using NavigationService (native only)
    if (Platform.OS !== 'web' && NotificationHandler) {
      await NotificationHandler.processPendingNotification();
    }

    // Also check for stored retry notifications
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const retryData = await AsyncStorage.getItem('retryNotificationNavigation');

      if (retryData) {
        console.log('🔄 Found retry notification data, processing...');
        const parsedData = JSON.parse(retryData);

        // Remove from storage first
        await AsyncStorage.removeItem('retryNotificationNavigation');

        // Process the retry navigation
        const success = await NavigationService.navigateFromNotification(parsedData);
        if (success) {
          console.log('✅ Retry notification navigation successful');
        } else {
          console.warn('⚠️ Retry notification navigation failed');
        }
      }
    } catch (error) {
      console.warn('⚠️ Error processing retry notifications:', error.message);
    }
  };

  return (
    <>
      {appError ? (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorTitle}>App Loading Error</Text>
          <Text style={styles.errorText}>
            There was an issue loading the app. Please restart the application.
          </Text>
          <Text style={styles.errorDetails}>
            Error: {appError}
          </Text>
        </SafeAreaView>
      ) : (
        <>
          <AppNavigator ref={navigationRef} onReady={onNavigationReady} />
          {isChecking && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="small" color="#1E90FF" />
            </View>
          )}
        </>
      )}

      {/* Reminder Popup */}
      <ReminderPopup
        visible={showReminderPopup}
        reminder={currentReminder}
        onEdit={currentReminder?.onEdit}
        onClose={handleReminderClose}
      />

      {/* Employee Notification Popup for Admin */}
      <EmployeeNotificationPopup
        visible={employeePopupVisible}
        type={employeePopupData?.type || employeePopupData?.notificationType || 'reminder'}
        employeeName={employeePopupData?.employeeName || employeePopupData?.senderName || 'Employee'}
        title={employeePopupData?.title || ''}
        clientName={employeePopupData?.clientName || employeePopupData?.name || ''}
        reason={employeePopupData?.reason || (employeePopupData?.type === 'alert' ? employeePopupData?.note : '') || ''}
        note={employeePopupData?.note || employeePopupData?.body || employeePopupData?.message || ''}
        scheduledAt={employeePopupData?.scheduledAt || employeePopupData?.scheduledDateTime || employeePopupData?.reminderDateTime || ''}
        nextScheduledAt={employeePopupData?.nextScheduledAt || ''}
        onEdit={employeePopupData?.onEdit}
        onClose={() => {
          setEmployeePopupVisible(false);
          setEmployeePopupData(null);
        }}
      />

      {/* NEW: Specialized Admin Notification Popup */}
      <AdminNotificationPopup
        visible={adminPopupVisible}
        employeeName={adminPopupData?.employeeName || 'Admin'}
        title={adminPopupData?.title || 'Admin Reminder'}
        clientName={adminPopupData?.clientName || ''}
        reason={adminPopupData?.reason || ''}
        note={adminPopupData?.note || ''}
        scheduledAt={adminPopupData?.scheduledAt || adminPopupData?.scheduledDateTime || adminPopupData?.reminderDateTime || ''}
        nextScheduledAt={adminPopupData?.nextScheduledAt || ''}
        createdAt={adminPopupData?.createdAt || (adminPopupData?.date && adminPopupData?.time ? `${adminPopupData.date}T${adminPopupData.time}:00.000Z` : '')} // 🔥 Construct from date+time if createdAt missing
        type={adminPopupData?.type || adminPopupData?.notificationType || 'admin_reminder'}
        onEdit={adminPopupData?.onEdit}
        onClose={() => {
          setAdminPopupVisible(false);
          setAdminPopupData(null);
        }}
      />

      {/* Update Popup */}
      <UpdateModal 
        visible={showUpdateModal}
        forceUpdate={forceUpdate}
        onUpdate={handleUpdate}
        onLater={handleLater}
      />
    </>
  );
};

// Error boundary styles
const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorDetails: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

// Main App Component wrapped with Error Boundary
const App = () => {
  return (
    <ErrorBoundary>
      <AppMain />
    </ErrorBoundary>
  );
};

export default App;
