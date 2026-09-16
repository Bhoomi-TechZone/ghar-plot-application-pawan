/**
 * NotificationHandler.js
 * Centralized handler for notification events and navigation
 * Works with @notifee/react-native for foreground/background/killed states
 */
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavigationService from './NavigationService';
import { Platform } from 'react-native';

class NotificationHandler {
  // 🔥 Navigation lock to prevent duplicate navigation
  static isNavigating = false;
  static lastNavigationTime = 0;
  static NAVIGATION_COOLDOWN = 3000; // 3 seconds cooldown

  /**
   * Setup notification event listeners for FOREGROUND only
   * Background events are handled at the top level
   * @param {Object} navigationRef - React Navigation ref
   */
  static setupNotificationListeners(navigationRef) {
    console.log('🔔 Setting up foreground notification listeners');

    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log('📱 Foreground Event Type:', type);
      const now = Date.now();

      // Type 1 = PRESS, Type 2 = ACTION_PRESS
      if (type === 1 || type === 2) {
        const actionId = detail.pressAction?.id;

        // 🔥 CRITICAL FIX: Cancel ONLY the tapped notification, not all notifications
        // This prevents clearing other pending notifications from the tray
        const tappedNotificationId = detail.notification?.id;
        if (tappedNotificationId) {
          try {
            await notifee.cancelNotification(tappedNotificationId);
            console.log(`✅ Cancelled only tapped notification: ${tappedNotificationId}`);
          } catch (cancelError) {
            console.warn('⚠️ Failed to cancel tapped notification:', cancelError.message);
          }
        }

        // 🔥 FIX: If the background handler already processed this tap and queued
        // a popup (triggerReminderPopup), skip foreground navigation to prevent
        // the popup from being auto-dismissed by a competing navigation.
        try {
          const handledNotifId = await AsyncStorage.getItem('notificationNavigationDone');
          const currentNotifId = detail.notification?.id;
          
          if (handledNotifId) {
            // Always clear it to prevent stale flags blocking future taps
            await AsyncStorage.removeItem('notificationNavigationDone');
            
            // If it matches the current notification, or if it was the legacy 'true' string (for backward compatibility), 
            // skip foreground navigation because the background handler just did it.
            if (handledNotifId === currentNotifId || handledNotifId === 'true') {
              console.log('⏭️ Skipping foreground navigation — background handler already processed this tap');

            // 🔥 FIX (Issue 1): Immediately process pending popup data here.
            // The AppState handler uses a guard flag that may already be set, so it
            // won't re-run for this AppState transition — we must trigger the popup
            // directly instead of waiting for the next AppState change.
            try {
              const pendingRaw = await AsyncStorage.getItem('pendingNotificationData');
              if (pendingRaw) {
                const pending = JSON.parse(pendingRaw);
                if (pending.triggerReminderPopup && pending.data && global.triggerProfessionalReminder) {
                  await AsyncStorage.removeItem('pendingNotificationData');
                  console.log('🔔 [FG SKIP] Triggering popup directly from pending data (background tap)');
                  setTimeout(() => {
                    global.triggerProfessionalReminder(pending.data);
                  }, 300);
                }
              }
            } catch (_) {}

            return;
            } // Close if (handledNotifId === currentNotifId || handledNotifId === 'true')
          } // Close if (handledNotifId)
        } catch (_) {}

        if (this.isNavigating || (now - this.lastNavigationTime) < this.NAVIGATION_COOLDOWN) {
          console.log('⚠️ Navigation locked (foreground), skipping');
          return;
        }

        if (actionId === 'edit_reminder') {
           this.isNavigating = true;
           this.lastNavigationTime = now;
           this.handleEditAction(detail.notification, navigationRef, 'edit_reminder');
           setTimeout(() => { this.isNavigating = false; }, this.NAVIGATION_COOLDOWN);
           return;
        }
        if (actionId === 'edit_alert') {
           this.isNavigating = true;
           this.lastNavigationTime = now;
           this.handleEditAction(detail.notification, navigationRef, 'edit_alert');
           setTimeout(() => { this.isNavigating = false; }, this.NAVIGATION_COOLDOWN);
           return;
        }

        // 🔥 FIX (Issue 2): When the app is in foreground and user taps an admin/alert
        // notification, show the popup dialog instead of navigating to EditAlert.
        // This handles the case where the background handler did NOT run
        // (i.e., notifee fired onForegroundEvent directly because app was active).
        const tappedData = detail.notification?.data || {};
        const tappedType = String(tappedData.type || tappedData.notificationType || tappedData.category || '').toLowerCase();
        
        // 🍎 iOS-SPECIFIC: Check if this is a local fallback notification
        const isLocalFallback = Platform.OS === 'ios' && (
          tappedData['gharplot.localFallback'] === 1 || 
          tappedData['gharplot.localFallback'] === '1' ||
          tappedData['gharplot.localFallback'] === true ||
          tappedData['gharplot.localFallback'] === 'true'
        );
        
        const isAdminOrAlert = tappedType === 'admin_reminder' || tappedType === 'alert' ||
                               tappedType === 'system_alert' || tappedType === 'employee_alert_to_admin' ||
                               !!tappedData.alertId ||
                               isLocalFallback; // ← iOS local fallback always shows popup

        if (isAdminOrAlert && global.triggerProfessionalReminder) {
          console.log('🔔 [FG TAP] Admin/Alert notification tapped while app in foreground — showing popup dialog');
          if (isLocalFallback) {
            console.log('🍎 iOS local fallback detected in foreground tap');
          }
          global.triggerProfessionalReminder({
            ...tappedData,
            type: tappedData.alertId ? 'admin_reminder' : (tappedType || 'reminder'),
            title: detail.notification?.title || tappedData.title || 'Reminder',
            note: detail.notification?.body || tappedData.note || tappedData.reason || tappedData.body || '',
          });
          setTimeout(() => { this.isNavigating = false; }, this.NAVIGATION_COOLDOWN);
          return;
        }

        this.isNavigating = true;
        this.lastNavigationTime = now;
        this.handleNotificationPress(detail.notification, navigationRef);
        setTimeout(() => { this.isNavigating = false; }, this.NAVIGATION_COOLDOWN);

      } else if (type === 3) {
        // 🔥 Event Type 3 = DELIVERED (Foreground)
        console.log('🚨🚨🚨 [FG] Local Notification DELIVERED (Event 3)');
        const notifData = detail.notification?.data || {};
        
        // 🍎 iOS-SPECIFIC: Check if this is a local fallback notification delivered in foreground
        const isLocalFallback = Platform.OS === 'ios' && (
          notifData['gharplot.localFallback'] === 1 || 
          notifData['gharplot.localFallback'] === '1' ||
          notifData['gharplot.localFallback'] === true ||
          notifData['gharplot.localFallback'] === 'true'
        );
        
        if (isLocalFallback) {
          console.log('🍎 iOS local fallback notification delivered in foreground');
          console.log('📦 Notification data:', JSON.stringify(notifData, null, 2));
          
          // Wait a bit for global.triggerProfessionalReminder to be defined
          const tryTriggerPopup = (attempts = 0) => {
            if (global.triggerProfessionalReminder) {
              console.log('✅ Triggering iOS local fallback popup now');
              const notificationType = notifData.alertId ? 'admin_reminder' : 
                                      (notifData.type === 'alert' || notifData.category === 'alert' ? 'alert' : 'reminder');
              global.triggerProfessionalReminder({
                ...notifData,
                type: notificationType,
                notificationType: notificationType,
                title: detail.notification?.title || notifData.title || notifData.alertTitle || 'Reminder',
                note: detail.notification?.body || notifData.note || notifData.reason || notifData.body || notifData.alertReason || ''
              });
              console.log('✅ iOS local fallback popup triggered on DELIVERED event');
            } else if (attempts < 5) {
              console.log(`⏳ Waiting for global.triggerProfessionalReminder (attempt ${attempts + 1}/5)`);
              setTimeout(() => tryTriggerPopup(attempts + 1), 200);
            } else {
              console.error('❌ global.triggerProfessionalReminder not defined after 5 attempts');
            }
          };
          
          tryTriggerPopup();
          return; // Don't process further for local fallback
        }
        
        this.triggerPopups(detail.notification);

        // 🔥 Only reschedule if this was a locally-scheduled notification
        // FCM display-notifications also trigger Event 3 — we skip those here
        if (
          notifData.isLocalTrigger === 'true' &&
          notifData.alertId &&
          notifData.repeatFrequency &&
          notifData.repeatFrequency !== 'none'
        ) {
          this.rescheduleRepeat(notifData);
        } else if (notifData.alertId && notifData.repeatFrequency && notifData.repeatFrequency !== 'none') {
          console.log('⏭️ Skipping reschedule — FCM display notification (no scheduledAt), backend handles repeat');
        }
      }
    });

    this.checkInitialNotification(navigationRef);
    return unsubscribeForeground;
  }

  /**
   * Universal Reschedule Helper (Prevents Drift)
   */
  static async rescheduleRepeat(notifData) {
    try {
      const repeatFrequency = notifData.repeatFrequency;
      const alertId = notifData.alertId;
      if (!alertId || !repeatFrequency || repeatFrequency === 'none') return;

      console.log(`🔁 Rescheduling next ${repeatFrequency} occurrence for: ${alertId}`);
      
      let repeatMetadata = notifData.repeatMetadata || {};
      if (typeof repeatMetadata === 'string') {
        try { repeatMetadata = JSON.parse(repeatMetadata); } catch(_) { repeatMetadata = {}; }
      }

      const baseAt = notifData.scheduledAt || notifData.scheduledFor || notifData.date; 

      // 🔥 Improved Interval Detection — NO default fallback for custom repeat
      const rawInterval = 
        notifData.customRepeatMinutes || 
        notifData.customIntervalMinutes || 
        notifData.interval || 
        notifData.minutes || 
        repeatMetadata.customIntervalMinutes || 
        repeatMetadata.interval;

      if (repeatFrequency === 'custom' && !rawInterval) {
        console.warn('⚠️ Custom repeat has no interval defined — skipping reschedule to avoid defaulting to 60 mins');
        return;
      }

      let customRepeatMinutes = parseInt(rawInterval || 60);

      const AlertNotificationService = require('./AlertNotificationService').default;
      await AlertNotificationService.scheduleAlert({
        id: alertId,
        time: notifData.time || '',
        date: notifData.date || new Date().toISOString().split('T')[0],
        title: notifData.title || notifData.alertTitle || 'Reminder',
        reason: notifData.reason || notifData.message || notifData.note || '',
        repeatFrequency,
        repeatMetadata,
        repeatDaily: notifData.repeatDaily === 'true' || notifData.repeatDaily === true,
        customRepeatMinutes: customRepeatMinutes,
        notificationType: notifData.type || 'admin_reminder',
        baseDate: notifData.baseDate || (baseAt && baseAt.length > 10 ? baseAt : new Date().toISOString())
      });
      console.log(`✅ Next ${repeatFrequency} occurrence rescheduled successfully`);
    } catch (err) {
      console.error('❌ Reschedule failed:', err);
    }
  }

  /**
   * Helper to trigger popups with strict priority (Alert > Admin > Standard)
   */
  static triggerPopups(notification) {
    try {
      if (!notification) return;
      const data = notification.data || {};
      
      // 🛡️ DEDUPLICATION (Admin Alert Only): 
      // Check if this alert was recently seen to prevent dual in-app popups.
      const cleanAlertId = data.alertId ? String(data.alertId).replace(/^(alert_|notif_)/, '') : null;
      if (cleanAlertId) {
        const { shouldShowAlert } = require('../utils/alertDedup');
        if (!shouldShowAlert(cleanAlertId)) {
          console.log(`🛡️ [DE-DUP] Skipping redundant in-app popup for alert: ${cleanAlertId}`);
          return;
        }
      }
      // 1. Extract all text fields for classification
      const nType = String(data.type || data.notificationType || data.category || '').toLowerCase();
      const nTitle = String(notification.title || data.title || data.reminderTitle || '').toLowerCase();
      const nBody = String(notification.body || data.note || data.message || data.reason || '').toLowerCase();
      const nEmp = String(data.employeeName || data.senderName || data.name || '').toLowerCase();
      
      const searchableText = (nType + " " + nTitle + " " + nBody + " " + nEmp);

      // 2. Identify Theme (Alert: Red, Admin: Indigo, Standard: Indigo)
      // Priority 1: Any alert/emergency/urgent keyword -> RED POPUP
      const isAlert = searchableText.includes('alert') || 
                      searchableText.includes('emergency') || 
                      searchableText.includes('urgent');
      
      // Priority 2: Admin indicators (but not an alert) -> INDIGO ADMIN POPUP
      const isAdmin = !isAlert && (searchableText.includes('admin') || nType === 'admin_reminder' || !!data.alertId);

      let finalType = 'reminder';
      if (isAlert) finalType = 'alert';
      else if (isAdmin) finalType = 'admin_reminder';

      console.log(`🚨 [DEDUP] Popup Classification: ${finalType} (isAlert: ${isAlert}, isAdmin: ${isAdmin})`);

      // 3. Trigger the appropriate component via the Manager
      const { showEmployeeNotificationPopup } = require('./EmployeePopupManager');
      showEmployeeNotificationPopup({
        ...data,
        type: finalType,
        title: notification.title || data.title || data.reminderTitle || (isAlert ? 'Alert' : 'Reminder'),
        note: notification.body || data.note || data.message || data.reason || '',
        reason: notification.body || data.reason || data.note || ''
      });
    } catch (err) {
      console.warn('⚠️ Popup trigger failed:', err.message);
    }
  }

  /**
   * Handle edit action from notification
   * Navigate to EditReminderScreen or EditAlertScreen
   * @param {Object} notification - Notification object
   * @param {Object} navigationRef - React Navigation ref
   * @param {string} actionId - Action ID (edit_reminder or edit_alert)
   */
  static async handleEditAction(notification, navigationRef, actionId) {
    try {
      console.log('✏️ Handling edit action:', actionId);
      const notificationData = notification?.data;

      if (!notificationData) {
        console.warn('⚠️ No data in notification');
        return;
      }

      if (actionId === 'edit_reminder') {
        // Navigate to EditReminderScreen
        const editParams = {
          reminderId: notificationData.reminderId || notification.id,
          clientName: notificationData.clientName || 'Client',
          originalMessage: notification.body || '',
          enquiryId: notificationData.enquiryId,
        };

        console.log('📤 Navigating to EditReminderScreen with:', editParams);

        // 🔥 Use NavigationService navigateNested to stay in Admin stack
        NavigationService.navigateNested('AdminApp', 'EditReminder', editParams);
      } else if (actionId === 'edit_alert') {
        // Navigate to EditAlertScreen
        const editParams = {
          alertId: notificationData.alertId?.replace('alert_', '') || notification.id?.replace('alert_', ''),
          originalReason: notification.body || '',
          originalDate: notificationData.date,
          originalTime: notificationData.time,
          repeatDaily: notificationData.repeatDaily,
        };

        console.log('📤 Navigating to EditAlertScreen with:', editParams);

        // 🔥 Use NavigationService navigateNested to stay in Admin stack
        NavigationService.navigateNested('AdminApp', 'EditAlert', editParams);
      }
    } catch (error) {
      console.error('❌ Error handling edit action:', error);
    }
  }

  /**
   * Handle notification press and navigate to target screen
   * @param {Object} notification - Notification object from notifee
   * @param {Object} navigationRef - React Navigation ref (optional, uses NavigationService)
   */
  static async handleNotificationPress(notification, navigationRef = null) {
    try {
      console.log('🎯 Handling notification press');
      const notificationData = notification?.data;

      if (!notificationData) {
        console.warn('⚠️ No data in notification');
        return;
      }

      // 🍎 iOS-SPECIFIC: Check if this is a local fallback notification
      // Local fallback = data-only FCM push converted to iOS local notification
      // These should show POPUP, not navigate directly to screen
      const isLocalFallback = Platform.OS === 'ios' && (
        notificationData['gharplot.localFallback'] === 1 || 
        notificationData['gharplot.localFallback'] === '1' ||
        notificationData['gharplot.localFallback'] === true ||
        notificationData['gharplot.localFallback'] === 'true'
      );

      if (isLocalFallback) {
        console.log('🍎 iOS local fallback notification tapped — showing popup instead of navigating');
        console.log('📦 Notification data:', JSON.stringify(notificationData, null, 2));
        
        // Trigger popup with notification data
        if (global.triggerProfessionalReminder) {
          const notificationType = notificationData.alertId ? 'admin_reminder' : 
                                  (notificationData.type === 'alert' || notificationData.category === 'alert' ? 'alert' : 'reminder');
          global.triggerProfessionalReminder({
            ...notificationData,
            type: notificationType,
            notificationType: notificationType,
            title: notification?.title || notificationData.title || notificationData.alertTitle || 'Reminder',
            note: notification?.body || notificationData.note || notificationData.reason || notificationData.body || notificationData.alertReason || ''
          });
          console.log('✅ Popup triggered from iOS local fallback tap (via NotificationHandler)');
          return; // ← CRITICAL: Stop here, don't navigate
        } else {
          console.error('❌ global.triggerProfessionalReminder not defined');
        }
      }

      const notifType = notificationData.type || notificationData.notificationType || 'reminder';
      console.log('🚀 Processing notification press for type:', notifType);

      // 1. Handle Chat Notifications
      if (notifType === 'chat' || notificationData.chatId) {
        console.log('💬 Chat notification - Navigating to ChatDetailScreen');
        const { chatId, senderId, senderName } = notificationData;
        const NavigationService = require('./NavigationService').default;
        NavigationService.navigate('ChatDetailScreen', {
          chatId: chatId,
          user: { _id: senderId, fullName: senderName || 'User' }
        });
        return;
      }

      // 2. Priority: Handle Alerts and Admin-created reminders (which are technically alerts)
      if (notifType === 'admin_reminder' || notifType === 'alert' || notifType === 'system_alert' || notifType === 'employee_alert_to_admin' || notificationData.alertId) {
        console.log(`🚀 ${notifType} notification - Triggering popup dialog`);

        const alertId = notificationData.alertId || notificationData.reminderId || notification?.id;
        const cleanAlertId = alertId ? String(alertId).replace('alert_', '') : Date.now().toString();

        const popupData = {
          ...notificationData,
          fromTap: true,
          alertId: cleanAlertId,
          type: notificationData.alertId ? 'admin_reminder' : (notifType || 'alert'),
          title: notificationData.alertTitle || notificationData.title || notificationData.reminderTitle || notification?.title || (notifType === 'alert' ? 'Alert' : 'Reminder'),
          note: notificationData.alertReason || notificationData.reason || notificationData.message || notificationData.note || notification?.body || '',
        };

        if (global.triggerProfessionalReminder) {
          console.log('✅ Triggering popup directly from NotificationHandler');
          global.triggerProfessionalReminder(popupData);
          return;
        }

        // Store for AppState / onNavigationReady to trigger popup
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('pendingNotificationData', JSON.stringify({
            triggerReminderPopup: true,
            data: popupData,
            timestamp: Date.now()
          }));
          return;
        } catch (_) {}

        const params = {
          alertId: cleanAlertId,
          originalTitle: popupData.title,
          originalReason: popupData.note,
          originalDate: notificationData.scheduledDate || notificationData.date || notificationData.reminderTime || '',
          originalTime: notificationData.scheduledTime || notificationData.time || '',
          repeatDaily: (notificationData.repeatDaily === 'true' || notificationData.repeatDaily === true || notificationData.repeatFrequency === 'daily')
        };

        console.log('📤 Alert navigation params (fallback):', params);
        const NavigationService = require('./NavigationService').default;
        NavigationService.navigate('EditAlert', params);
        return;
      }

      // 2. Handle Employee reminders to Admin (Read-only view)
      if (notifType === 'employee_reminder_to_admin') {
         console.log('📤 Navigating to AdminReminderDetailsScreen (Employee-to-Admin)');
         const NavigationService = require('./NavigationService').default;
         const params = {
            reminderId: notificationData.reminderId || notification?.id,
            employeeName: notificationData.employeeName || '',
            employeeEmail: notificationData.employeeEmail || '',
            reminderTitle: notificationData.reminderTitle || notificationData.title || notification?.title || '',
            clientName: notificationData.clientName || '',
            phone: notificationData.phone || notificationData.phoneNumber || '',
            location: notificationData.location || '',
            note: notificationData.note || notificationData.comment || notificationData.message || notification?.body || '',
            reminderTime: notificationData.reminderTime || notificationData.scheduledDate || notificationData.timestamp || '',
            enquiryId: notificationData.enquiryId,
            fromNotification: true
         };
         NavigationService.navigate('AdminReminderDetailsScreen', params);
         return;
      }

      // 3. Handle Normal Employee reminders
      if (notifType === 'reminder' || notifType === 'enquiry_reminder' || notifType === 'employee_due_reminder') {
        console.log('📤 Navigating to EmployeeReminderDetailsScreen');
        const NavigationService = require('./NavigationService').default;
        const params = {
          reminderId: notificationData.reminderId || notification?.id,
          clientName: notificationData.clientName || notification?.title || '',
          originalMessage: notificationData.message || notificationData.comment || notificationData.note || notification?.body || '',
          enquiryId: notificationData.enquiryId,
          fromNotification: true,
          phone: notificationData.phone || notificationData.phoneNumber || notificationData.contactNumber || '',
          email: notificationData.email || '',
          location: notificationData.location || '',
          reminderTime: notificationData.reminderTime || notificationData.scheduledDate || notificationData.scheduledTime || (notificationData.date && notificationData.time ? `${notificationData.date} ${notificationData.time}` : (notificationData.date || notificationData.time || '')),
          isRepeating: notificationData.isRepeating === 'true' || notificationData.isRepeating === true,
          repeatType: notificationData.repeatType || 'none',
        };
        NavigationService.navigate('EmployeeReminderDetailsScreen', params);
        return;
      }

      // Extract navigation parameters from notification data for other types
      const {
        targetScreen = type === 'enquiry_reminder' ? 'EnquiriesScreen' : 'EnquiryDetails',
        navigationType = 'nested',
        enquiryId,
        clientName,
        reminderId,
        navigationData = {} // Additional navigation data
      } = notificationData;

      // Prepare comprehensive navigation data
      const navData = {
        targetScreen: type === 'enquiry_reminder' ? 'EnquiriesScreen' : targetScreen,
        navigationType,
        enquiryId,
        clientName,
        reminderId,
        navigationData: {
          ...navigationData,
          scrollToEnquiry: enquiryId,
          showDetails: true,
          fromNotification: true,
          isReminderNotification: type === 'enquiry_reminder',
          timestamp: Date.now()
        }
      };

      console.log('🚀 Prepared navigation data:', navData);

      // Use NavigationService for navigation
      const success = await NavigationService.navigateFromNotification(navData);

      if (!success) {
        console.warn('⚠️ Navigation failed, storing for later');
        await this.storeNotificationData(notification);
      }
    } catch (error) {
      console.error('❌ Error handling notification press:', error);
      await this.storeNotificationData(notification);
    }
  }

  /**
   * Check if app was opened by notification (when killed/closed)
   * @param {Object} navigationRef - React Navigation ref
   */
  static checkInitialNotification(navigationRef) {
    notifee
      .getInitialNotification()
      .then(async (initialNotification) => {
        if (initialNotification) {
          console.log('🚀 App opened from killed state by notification');
          console.log('📱 Initial Notification:', initialNotification.notification);

          // 🔥 CRITICAL FIX: Cancel ONLY the tapped notification, not all notifications
          // This prevents clearing other pending notifications from the tray
          const tappedNotificationId = initialNotification.notification?.id;
          if (tappedNotificationId) {
            try {
              await notifee.cancelNotification(tappedNotificationId);
              console.log(`✅ Cancelled only tapped notification: ${tappedNotificationId}`);
            } catch (cancelError) {
              console.warn('⚠️ Failed to cancel tapped notification:', cancelError.message);
            }
          }

          // Treat cold start tap EXACTLY like background tap
          // This ensures the popup dialog opens instead of bypassing directly to Edit page
          const actionId = initialNotification.pressAction?.id;
          this.storeNotificationData(initialNotification.notification, actionId);
        }
      })
      .catch((error) => {
        console.error('❌ Error checking initial notification:', error);
      });
  }

  /**
   * Store notification data for processing when app resumes
   * Useful when notification is clicked but app is not ready
   * @param {Object} notification - Notification to store
   * @param {string} actionId - Optional action ID (edit_reminder, edit_alert, etc.)
   */
  static async storeNotificationData(notification, actionId = null) {
    try {
      // Avoid duplicate handling of the *same* notification tap, but never let
      // an old pending item block a newer notification. A stale popup used to
      // make all later cold-start notification taps get ignored.
      const sourceNotificationId = String(
        notification?.id || notification?.messageId || notification?.data?.messageId || ''
      );
      const existingRaw = await AsyncStorage.getItem('pendingNotificationData');
      if (existingRaw) {
        try {
          const existing = JSON.parse(existingRaw);
          if (
            existing.triggerReminderPopup &&
            sourceNotificationId &&
            existing.sourceNotificationId === sourceNotificationId
          ) {
            console.log('⏭️ Skipping tap storage - popup already queued for this notification');
            return;
          }
        } catch (_) {}
      }

      const notifData = notification?.data || {};
      
      // 🍎 iOS-SPECIFIC: Check if this is a local fallback notification
      const isLocalFallback = Platform.OS === 'ios' && (
        notifData['gharplot.localFallback'] === 1 || 
        notifData['gharplot.localFallback'] === '1' ||
        notifData['gharplot.localFallback'] === true ||
        notifData['gharplot.localFallback'] === 'true'
      );
      
      const notifType = notifData.alertId ? 'admin_reminder' : (notifData.type || notifData.notificationType || notifData.category || 'reminder');
      const isReminderOrAlert = /reminder|follow|alert/i.test(notifType) || 
                                /reminder|follow|alert|रिमाइंडर/i.test(notification?.title || '') ||
                                notifData.alertId ||
                                notifData.reminderId ||
                                isLocalFallback;

      if (isReminderOrAlert) {
         console.log('💾 Storing popup data for:', isLocalFallback ? 'iOS local fallback' : notifType);
         const popupData = {
           triggerReminderPopup: true,
           sourceNotificationId,
           data: {
             ...notifData,
             fromTap: true,
             type: notifType,
             title: notification?.title || notifData.title || notifData.alertTitle || (notifType === 'alert' ? 'Alert' : 'Reminder'),
             note: notification?.body || notifData.note || notifData.message || notifData.reason || notifData.alertReason || ''
           },
           timestamp: Date.now()
         };
         await AsyncStorage.setItem('pendingNotificationData', JSON.stringify(popupData));
         console.log('💾 Popup data stored directly from notification tap');
         return;
      }

      const notificationData = {
        id: notification?.id,
        data: notification?.data,
        body: notification?.body,
        actionId: actionId,
        timestamp: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        'pendingNotificationData',
        JSON.stringify(notificationData)
      );
      console.log('💾 Notification data stored for later processing');
    } catch (error) {
      console.error('❌ Error storing notification data:', error);
    }
  }

  /**
   * Retrieve and clear stored notification data
   * Call this from App.js after navigation is ready
   * @returns {Object|null} Stored notification data or null
   */
  static async getPendingNotificationData() {
    try {
      const data = await AsyncStorage.getItem('pendingNotificationData');
      if (data) {
        const parsedData = JSON.parse(data);
        
        // 🔥 FIX: If it's a popup trigger, DO NOT delete it here! 
        // App.js handles popup triggers locally. 
        if (parsedData.triggerReminderPopup) {
           console.log('⏭️ Skipping deletion in NotificationHandler: popup data should be handled by App.js');
           return null; // Return null so NotificationHandler skips processing it
        }

        await AsyncStorage.removeItem('pendingNotificationData');
        console.log('📨 Retrieved pending notification data:', parsedData);
        return parsedData;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting pending notification:', error);
      return null;
    }
  }

  /**
   * Process pending notification data when app becomes ready
   * @param {Object} navigationRef - React Navigation ref (optional)
   */
  static async processPendingNotification(navigationRef = null) {
    try {
      const pendingData = await this.getPendingNotificationData();
      if (pendingData) {
        console.log('⏳ Processing pending notification');

        // 🔥 SKIP these screens here - AppState handler will do it to avoid double navigation
        if (pendingData.navigateTo === 'EditReminder' || 
            pendingData.navigateTo === 'AdminReminderDetailsScreen' || 
            pendingData.navigateTo === 'EmployeeReminderDetailsScreen') {
          console.log(`⏭️ SKIPPING ${pendingData.navigateTo} in processPendingNotification - AppState will handle`);
          return;
        }

        // 🔥 CRITICAL: Check for immediate navigation flag (Alert notifications)
        if (pendingData.shouldNavigateImmediately && pendingData.navigateTo && pendingData.navigationParams) {
          console.log('🚀🚀 IMMEDIATE NAVIGATION REQUIRED for:', pendingData.navigateTo);
          console.log('📤 Navigation params:', pendingData.navigationParams);

          // 🔥 NO DELAY - Immediate navigation!
          try {
            const NavigationService = require('./NavigationService').default;
            if (NavigationService.isReady()) {
              NavigationService.navigate(pendingData.navigateTo, pendingData.navigationParams);
              console.log('✅ IMMEDIATE navigation to', pendingData.navigateTo, 'SUCCESS!');
            } else {
              console.error('❌ NavigationService not ready for immediate navigation');
            }
          } catch (navError) {
            console.error('❌ Immediate navigation failed:', navError);
          }
          return;
        }

        // Regular notification processing
        if (navigationRef?.current?.isReady?.()) {
          // Create a fake notification object
          const fakeNotification = {
            id: pendingData.id,
            data: pendingData.data,
            body: pendingData.body,
          };

          // Check if it's an edit action
          if (pendingData.actionId === 'edit_reminder' || pendingData.actionId === 'edit_alert') {
            await this.handleEditAction(fakeNotification, navigationRef, pendingData.actionId);
          } else {
            await this.handleNotificationPress(fakeNotification, navigationRef);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing pending notification:', error);
    }
  }
  /**
   * Register background event handler
   * Call this from index.js for maximum reliability
   */
  static registerBackgroundHandler() {
    console.log('🌅 Registering global background event handler');
    
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const now = new Date();
      console.log(`🌅 [${now.toLocaleTimeString()}] Background Event Type: ${type}`);
      
      // 🔥 Log event type for clarity
      const eventTypeNames = {
        1: 'PRESS (user tapped notification)',
        2: 'ACTION_PRESS (user tapped action button)',
        3: 'DELIVERED (notification arrived)',
        4: 'DISMISSED (user swiped away)'
      };
      console.log(`🌅 Event: ${eventTypeNames[type] || 'UNKNOWN'}`);
      
      const notifData = detail.notification?.data || {};

      // 🔥 FIX: Only handle PRESS and ACTION_PRESS events
      if (type === 1 || type === 2) {
        // ✅ USER EXPLICITLY TAPPED NOTIFICATION - OK to store and navigate
        console.log('✅ User tapped notification in background - storing for navigation');
        
        // 🔥 CRITICAL FIX: Cancel ONLY the tapped notification, not all notifications
        // This prevents clearing other pending notifications from the tray
        const tappedNotificationId = detail.notification?.id;
        if (tappedNotificationId) {
          try {
            await notifee.cancelNotification(tappedNotificationId);
            console.log(`✅ Cancelled only tapped notification: ${tappedNotificationId}`);
          } catch (cancelError) {
            console.warn('⚠️ Failed to cancel tapped notification:', cancelError.message);
          }
        }
        
        await NotificationHandler.storeNotificationData(detail.notification, detail.pressAction?.id);
        
        // Mark as navigated to prevent duplicate when app opens, using specific ID
        const notifId = detail.notification?.id || 'true';
        await AsyncStorage.setItem('notificationNavigationDone', notifId);

      } else if (type === 3) {
        // 🔥 Event Type 3 = DELIVERED (Background)
        console.log('🚨🚨🚨 [BACKGROUND] Local Notification DELIVERED (Event 3)');
        
        // 🍎 iOS-SPECIFIC: Check if this is a local fallback notification
        const isLocalFallback = Platform.OS === 'ios' && (
          notifData['gharplot.localFallback'] === 1 || 
          notifData['gharplot.localFallback'] === '1' ||
          notifData['gharplot.localFallback'] === true ||
          notifData['gharplot.localFallback'] === 'true'
        );
        
        if (isLocalFallback) {
          console.log('🍎 iOS local fallback notification delivered in background');
          console.log('📦 Notification will show popup when tapped by user');
          // Banner already displayed by iOS - no need to store popup data here
          // Popup will be triggered when user taps the notification (Event Type 1)
          return;
        }
        
        // LOCAL NOTIFICATION DISABLED — Only FCM push from backend should show
        // No dedup registration or rescheduling needed since local notifications are disabled
        // // 🛡️ Register in dedup so FCM arriving seconds later gets blocked
        // if (notifData.alertId && notifData.isLocalTrigger === 'true') {
        //   try {
        //     const { shouldShowAlert } = require('../utils/alertDedup');
        //     shouldShowAlert(notifData.alertId);
        //     console.log(`🛡️ [DE-DUP] Registered local delivery for alertId: ${notifData.alertId}`);
        //   } catch (_) {}
        // }
        // 
        // // Reschedule repeats
        // if (notifData.isLocalTrigger === 'true' && notifData.alertId && (notifData.repeatFrequency || notifData.repeatDaily)) {
        //   if (notifData.repeatFrequency !== 'none') {
        //     console.log(`🔁 Triggering manual reschedule for ${notifData.repeatFrequency} alert`);
        //     try {
        //       const AlertSvc = require('./AlertNotificationService').default;
        //       await AlertSvc.cancelTrigger(notifData.alertId);
        //     } catch (_) {}
        //     const rescheduleData = {
        //       ...notifData,
        //       baseDate: notifData.scheduledAt || new Date().toISOString()
        //     };
        //     await NotificationHandler.rescheduleRepeat(rescheduleData);
        //   }
        // } else if (notifData.alertId && notifData.repeatFrequency !== 'none') {
        //    console.log('⏭️ Skipping background reschedule — FCM display notification, backend or local trigger handles repeat');
        // }
        console.log('📱 Local reschedule SKIPPED — relying on backend FCM only');

        // ❌ DO NOT QUEUE POPUP FOR DELIVERED EVENTS
        // This was causing automatic app opening when notification arrives in background
        // Popups should ONLY be triggered when user explicitly taps notification (Event Type 1)
        console.log('⏭️ Skipping popup queue for DELIVERED event - app should stay in background');

      } else if (type === 4) {
        // ❌ DISMISSED event - user swiped away notification
        // DO NOT open app or trigger any action
        console.log('👋 User dismissed notification - NOT opening app');
      }
    });
  }
}

export default NotificationHandler;

/**
 * USAGE IN App.js:
 * 
 * 1. In useEffect, setup listeners:
 * ```
 * const unsubscribeNotification = NotificationHandler.setupNotificationListeners(
 *   navigationRef,
 *   (notification) => {
 *     console.log('Notification received:', notification);
 *   }
 * );
 * ```
 * 
 * 2. When navigation becomes ready:
 * ```
 * const onNavigationReady = async () => {
 *   // Process any pending notification from killed state
 *   await NotificationHandler.processPendingNotification(navigationRef);
 * };
 * ```
 * 
 * 3. In cleanup:
 * ```
 * return () => {
 *   if (unsubscribeNotification) {
 *     unsubscribeNotification();
 *   }
 * };
 * ```
 */
