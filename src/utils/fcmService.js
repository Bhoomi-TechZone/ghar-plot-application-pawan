/**
 * Firebase Cloud Messaging (FCM) Service
 * Handles push notification setup, token management, and foreground notifications
 */

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { shouldShowAlert, shouldProcessMessage } from './alertDedup';
import CrossPlatformAlert from './crossPlatformAlert';

// Storage key for FCM token
const FCM_TOKEN_KEY = '@fcm_token';

/**
 * Request notification permission from the user
 * Required for iOS and Android 13+
 * @returns {Promise<boolean>} true if permission granted
 */
export const requestNotificationPermission = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ Notification permission granted:', authStatus);
      return true;
    } else {
      console.log('❌ Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token and store it in AsyncStorage
 * @returns {Promise<string|null>} FCM token or null if failed
 */
export const getFCMToken = async () => {
  try {
    // Check if user has granted permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('⚠️ Cannot get FCM token: Permission not granted');
      return null;
    }

    // Get FCM token
    const token = await messaging().getToken();

    if (token) {
      console.log('✅ FCM Token retrieved:', token);

      // Store token in AsyncStorage
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      console.log('💾 FCM Token saved to AsyncStorage');

      return token;
    } else {
      console.log('⚠️ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

/**
 * Get stored FCM token from AsyncStorage
 * @returns {Promise<string|null>} Stored FCM token or null
 */
export const getStoredFCMToken = async () => {
  try {
    const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('❌ Error getting stored FCM token:', error);
    return null;
  }
};

/**
 * Force refresh FCM token (useful when Firebase project changes)
 * Deletes old token and gets a fresh one
 * @returns {Promise<string|null>} New FCM token or null
 */
export const forceRefreshFCMToken = async () => {
  try {
    console.log('🔄 Force refreshing FCM token...');

    // Delete old token from Firebase
    await messaging().deleteToken();
    console.log('🗑️ Old FCM token deleted');

    // Clear from AsyncStorage
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    console.log('🗑️ Stored token cleared');

    // Get fresh token
    const newToken = await messaging().getToken();

    if (newToken) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
      console.log('✅ New FCM Token:', newToken);
      return newToken;
    }

    return null;
  } catch (error) {
    console.error('❌ Error refreshing FCM token:', error);
    return null;
  }
};

/**
 * Setup foreground notification handler
 * Shows alert when notification is received while app is in foreground
 */
export const setupForegroundNotificationHandler = () => {
  console.log('🚀 FCM: Foreground Handler Registered');
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('📩 FCM: FOREGROUND MESSAGE RECEIVED!', JSON.stringify(remoteMessage.messageId));

    // 🛡️ Gate: skip if this exact messageId was already handled (FG+BG race)
    if (!shouldProcessMessage(remoteMessage.messageId)) return;

    // 🔥 MORE LOGS: Show the RAW message to identify why it might be skipped
    console.log('🚨🚨🚨 [DEBUG FCM] RAW Foreground Message:', JSON.stringify(remoteMessage.data, null, 2));

    // Get notification details - Support both data-only and notification+data formats
    const title = remoteMessage.notification?.title || remoteMessage.data?.title || '🔔 सूचना';
    const body = remoteMessage.notification?.body || remoteMessage.data?.body || remoteMessage.data?.message || '';
    const data = remoteMessage.data || {};

    // 🔥 Skip welcome/greeting notifications - don't show popup
    if (
      title?.toLowerCase().includes('welcome') ||
      body?.toLowerCase().includes('welcome back') ||
      body?.toLowerCase().includes('welcome to our platform') ||
      data?.type === 'welcome' ||
      data?.type === 'greeting' ||
      // 🔥 Skip "Notification Scheduled" confirmation messages from backend
      title?.toLowerCase().includes('scheduled') ||
      body?.toLowerCase().includes('scheduled')
    ) {
      console.log('⏭️ Skipping meta notification (welcome/scheduled)');
      return;
    }
    // 🚀 FIXED: Default to 'reminder' instead of 'system' for broad compatibility
    const notificationType = data.type || data.notificationType || 'reminder';

    // 🔥 FIXED: Robust Timestamp Check
    const rawTimestamp = data.timestamp || remoteMessage.sentTime;
    let msgTimestamp;

    if (!rawTimestamp) {
      msgTimestamp = Date.now();
    } else if (typeof rawTimestamp === 'string' && rawTimestamp.includes('-')) {
      // It's an ISO string or similar
      msgTimestamp = new Date(rawTimestamp).getTime();
    } else {
      // It's already a number or numeric string
      msgTimestamp = parseInt(rawTimestamp);
    }

    const ageMs = Date.now() - msgTimestamp;
    const STALENESS_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 hours for testing

    console.log(`⏱️ Message age: ${(ageMs / 1000 / 60).toFixed(1)} mins, type: ${data.type || data.notificationType}, timestamp raw: ${rawTimestamp}`);

    if (ageMs > STALENESS_LIMIT_MS) {
      console.log(`⏭️ Ignoring STALE foreground notification (${(ageMs / 1000 / 60).toFixed(1)} mins old): ${title}`);
      return;
    }

    // 🔔 Deduplication handled by ID mapping below


    // 🚀 UNIFIED CRM REMINDER IDENTIFICATION
    // Expanded to include ALL types that should show a popup
    const isReminderLike =
      notificationType === 'admin_reminder' ||
      notificationType === 'employee_due_reminder' ||
      notificationType === 'reminder' ||
      notificationType === 'employee_reminder_to_admin' ||
      notificationType === 'alert' ||
      notificationType === 'system_alert' ||
      notificationType === 'employee_alert_to_admin' ||
      notificationType === 'chat' ||
      !!data.reminderId ||
      !!data.reminderTitle ||
      !!data.alertId ||
      // 🔥 Fallback: Check title/body for keywords if type is missing
      (title && (title.toLowerCase().includes('reminder') || title.includes('रिमाइंडर') || title.toLowerCase().includes('followup'))) ||
      (body && (body.toLowerCase().includes('reminder') || body.includes('रिमाइंडर') || body.toLowerCase().includes('followup'))) ||
      (title && (title.toLowerCase().includes('alert') || title.includes('चेतावनी')));

    if (isReminderLike) {
      console.log('🚨🚨🚨 [DEBUG FCM] Identifed as CRM REMINDER/ALERT. Type:', notificationType);

      // Determine theme: Indigo ('reminder') vs Red ('alert')
      const isAdminUser = !!(await require('@react-native-async-storage/async-storage').default.getItem('adminToken'));

      const isIndigo =
        notificationType.includes('reminder') ||
        notificationType.includes('admin') ||
        notificationType.includes('followup') ||
        !!data.reminderId ||
        !!data.reminderTitle ||
        // 🔥 Robust fix: If user is Admin, treat personal 'alert' as 'reminder' (Indigo)
        (notificationType === 'alert' && isAdminUser && !!data.alertId) ||
        (title && (title.toLowerCase().includes('reminder') || title.toLowerCase().includes('remind') || title.toLowerCase().includes('follow') || title.includes('रिमाइंडर') || title.includes('रिमार्इंडर'))) ||
        (body && (body.toLowerCase().includes('reminder') || body.toLowerCase().includes('remind') || body.toLowerCase().includes('follow') || body.includes('रिमाइंडर') || body.includes('रिमार्इंडर')));

      const rAllMsg = (notificationType + " " + (data.category || '') + " " + title + " " + body).toLowerCase();

      // 🔥 REFINED DETECTION LOGIC
      // 1. ALERT: Explicit 'alert' category OR urgent keywords (and NOT a reminder)
      const isActuallyAlert =
        data.category === 'alert' ||
        notificationType === 'alert' ||
        ((rAllMsg.includes('alert') || rAllMsg.includes('emergency') || rAllMsg.includes('urgent')) && !rAllMsg.includes('reminder') && !rAllMsg.includes('follow'));

      // 2. ADMIN REMINDER: Specifically 'admin_reminder' OR an 'alert' with reminder keywords
      const isActuallyAdminRem = !isActuallyAlert && (
        notificationType === 'admin_reminder' ||
        notificationType === 'employee_reminder_to_admin' ||
        (data.category === 'reminder') ||
        !!data.alertId || // Backend alerts usually need Admin Reminder (Indigo) unless they say "ALERT"
        rAllMsg.includes('admin')
      );

      const popupType = isActuallyAlert ? 'alert' :
        (isActuallyAdminRem ? 'admin_reminder' :
          (isIndigo ? 'reminder' : 'alert'));

      console.log(`🚨🚨🚨 [DEBUG FCM] Theme calculated: ${popupType} (isIndigo: ${isIndigo}, isAlert: ${isActuallyAlert}, isAdmin: ${isActuallyAdminRem})`);

      // 🔥 NORMALIZE ID for consistent deduplication (Strip prefixes)
      const rawId = data.reminderId || data._id || data.alertId || data.id;
      const cleanId = rawId ? String(rawId).replace(/^(reminder_|alert_|notif_)/, '') : (remoteMessage.messageId || Date.now().toString());

      // SYNC ID PREFIXING logic with AlertNotificationService.js
      const prefix = isActuallyAlert ? 'alert_' : (isActuallyAdminRem ? 'reminder_' : 'notif_');
      // 🔥 CHANGED: Add timestamp to make each notification unique so they don't replace each other
      const uniqueTimestamp = Date.now();
      const unifiedId = `${prefix}${cleanId}_${uniqueTimestamp}`;

      // Update global ID tracking for debugging, but don't block the popup path yet.
      // The actual lockout should happen when the popup is about to be displayed.
      const now = Date.now();
      if (cleanId && !cleanId.includes(now.toString())) {
        global.lastGlobalReminderTime = now;
      }

      {
        // 1. Show Status Bar Notification (Heads-up)
        let richBody = data.body || body || data.reason || '';
        try {
          const notifee = require('@notifee/react-native').default;
          // 🎯 Consolidation: All employee-related followups use 'enquiry_reminders'
          // admin_reminder uses its own channel for distinct handling
          const isAdminRem = popupType === 'admin_reminder';
          const chanId = isAdminRem ? 'admin_reminders' : 'enquiry_reminders';

          // 🛡️ DEDUPLICATION (Admin Alert Only): 
          // Check if this alert was recently seen to prevent "2-2" tray items.
          // Note: We ONLY apply this to admin alerts (alertId present), NOT to general reminders.
          const cleanAlertId = data.alertId ? String(data.alertId).replace(/^(alert_|notif_)/, '') : null;
          const isProcessingAlert = !!cleanAlertId || notificationType === 'alert';

          if (isProcessingAlert && !shouldShowAlert(cleanAlertId)) {
            console.log(`🛡️ [DE-DUP] Skipping tray notification in foreground for duplicate alert: ${cleanAlertId}`);
            return;
          }

          console.log(`📩 [FG] FCM received for alert: ${cleanAlertId || 'no-alertId'}`);

          // 🔥 RICH FORMATTING: Add scheduled time & next scheduled time at bottom

          // Format time as h:mm AM/PM
          const _fmtTime = (isoStr) => {
            try {
              const d = new Date(isoStr);
              if (isNaN(d.getTime())) return null;
              let h = d.getHours();
              const m = String(d.getMinutes()).padStart(2, '0');
              const ampm = h >= 12 ? 'PM' : 'AM';
              h = h % 12;
              if (h === 0) h = 12;
              return `${h}:${m} ${ampm}`;
            } catch (_) { return null; }
          };

          // Scheduled time (clock icon)
          const _scheduledIso = data.scheduledAt || data.scheduledDateTime;
          if (_scheduledIso) {
            const formatted = _fmtTime(_scheduledIso);
            if (formatted) richBody = `${richBody}\n⏰ Scheduled: ${formatted}`;
          } else if (data.date && data.time) {
            let timeStr = typeof data.time === 'object'
              ? `${String(data.time.hour || 0).padStart(2, '0')}:${String(data.time.minute || 0).padStart(2, '0')}`
              : String(data.time);
            // No AM/PM for fallback
            richBody = `${richBody}\n⏰ Scheduled: ${timeStr}`;
          }

          // Next scheduled (repeat icon)
          if (data.nextScheduledAt) {
            const nextFormatted = _fmtTime(data.nextScheduledAt);
            if (nextFormatted) richBody = `${richBody}\n🔁 Next: ${nextFormatted}`;
          }

          // Period (hourglass icon)
          if (data.period) {
            richBody = `${richBody}\n⏳ In ${data.period}`;
          }

          await notifee.createChannel({
            id: chanId,
            name: chanId === 'enquiry_reminders' ? 'Reminders' : 'Admin Reminders',
            importance: 4,
            sound: 'default',
          });

          // 🎯 DEDUPLICATION: In the foreground, prioritize the PROFESSIONAL POPUP.
          // Only show the TRAY notification (Notifee) if it's NOT a reminder/alert
          // (which already shows a massive popup) or if it's explicitly desired.
          const shouldShowTrayNotif = !isReminderLike || notificationType === 'chat' || notificationType === 'system';

          if (shouldShowTrayNotif) {
            await notifee.displayNotification({
              id: unifiedId,
              title: data.title || title || (isIndigo ? '🔔 Reminder Alert' : '⚠️ System Alert'),
              body: richBody,
              android: {
                channelId: chanId,
                pressAction: { id: 'default' },
                fullScreenAction: { id: 'default' },
                importance: 4,
                priority: 'high',
                smallIcon: 'ic_launcher',
                onlyAlertOnce: false, // 🔥 CHANGED: Allow sound/vibration for each notification
                showWhen: true, // 🔥 ADDED: Show timestamp
                autoCancel: true, // 🔥 ADDED: Auto-dismiss when tapped
                // timeoutAfter: 10000, // 🔥 REMOVED: Notification will stay until user dismisses manually
                style: {
                  type: 1, // AndroidStyle.BIGTEXT
                  text: richBody,
                },
              },
              data: { type: popupType, ...data },
            });
            console.log(`✅ [FG] Notification ${unifiedId} displayed (stays until user dismisses)`);
          } else {
            console.log('⏭️ Skipping TRAY notification in foreground (Professional Popup will handle it)');
          }
        } catch (e) {
          console.log('⚠️ Notifee display failed:', e.message);
        }

        // 2. TRIGGER THE PROFESSIONAL DIALOG (Indigo/Red popup)
        if (global.triggerProfessionalReminder) {
          console.log('🚀 Triggering professional popup from FCM:', popupType);
          global.triggerProfessionalReminder({
            ...data,
            title: data.title || title || (isIndigo ? 'Reminder' : 'Alert'),
            body: richBody || body || 'You have a new message',
            type: popupType,
            notificationType: popupType
          });
        }
      }
      return;
    }


    // Save notification to local storage
    try {
      const { addNotification } = await import('./notificationManager');

      // Support both data-only and notification+data formats
      if (remoteMessage && (remoteMessage.notification || remoteMessage.data)) {
        const notification = {
          type: notificationType,
          title: title,
          message: body,
          body: body,
          data: data, // Store complete FCM data
          propertyId: data.propertyId,
          chatId: data.chatId,
          inquiryId: data.inquiryId,
          reminderId: data.reminderId,
          alertId: data.alertId,
          enquiryId: data.enquiryId,
          reason: data.reason,
          date: data.date,
          time: data.time,
          repeatDaily: data.repeatDaily,
          phoneNumber: data.phoneNumber || data.phone,
          clientName: data.clientName,
          image: data.image
        };

        await addNotification(notification);
        console.log('✅ Foreground notification saved to local storage');
      }
    } catch (error) {
      console.error('❌ Error saving foreground notification:', error);
    }
  });

  // Return unsubscribe function to cleanup when component unmounts
  return unsubscribe;
};

/**
 * Background message handler callback - exported so index.js can register it at top level.
 * MUST be registered via messaging().setBackgroundMessageHandler() in index.js
 * for killed-state delivery to work.
 */
export const backgroundMessageHandler = async (remoteMessage) => {
    console.log('📩 FCM: BACKGROUND/KILLED MESSAGE RECEIVED!', remoteMessage.messageId);

    // 🛡️ Gate: skip if this exact messageId was already handled (FG+BG race)
    if (!shouldProcessMessage(remoteMessage.messageId)) return;

    console.log('📩 🔥 BACKGROUND MESSAGE detail:', JSON.stringify(remoteMessage, null, 2));

    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const notifee = require('@notifee/react-native').default;

      // 🎯 Processing notificationType in background...
      const data = remoteMessage.data || {};
      const notification = remoteMessage.notification || {};

      const title = notification.title || data.title || 'Notification';
      const body = notification.body || data.body || data.message || '';
      // 🎯 Deduplication handled by ID mapping


      const notificationType = data.type || data.notificationType || 'system';

      console.log(`🎯 Processing ${notificationType} in background...`);

      // 🔥 FIXED: Robust Timestamp Check (Background)
      const rawTimestamp = data.timestamp || remoteMessage.sentTime;
      let msgTimestamp;

      if (!rawTimestamp) {
        msgTimestamp = Date.now();
      } else if (typeof rawTimestamp === 'string' && rawTimestamp.includes('-')) {
        msgTimestamp = new Date(rawTimestamp).getTime();
      } else {
        msgTimestamp = parseInt(rawTimestamp);
      }

      const ageMs = Date.now() - msgTimestamp;
      const STALENESS_LIMIT_MS = 12 * 60 * 60 * 1000; // Increased to 12 hours for background too

      // 🔥 Skip "Notification Scheduled" confirmation messages in background too
      if (
        title?.toLowerCase().includes('scheduled') ||
        body?.toLowerCase().includes('scheduled')
      ) {
        console.log('⏭️ Skipping meta background notification (scheduled)');
        return;
      }

      if (ageMs > STALENESS_LIMIT_MS) {
        console.log(`⏭️ Ignoring STALE background notification (${(ageMs / 1000 / 60).toFixed(1)} mins old): ${title}`);
        return;
      }

      // 🎯 Deduplication handled by ID mapping


      // 1️⃣ Save to local storage for "Notifications" screen (Inbox)
      try {
        const { addNotification } = await import('./notificationManager');
        const storageNotification = {
          id: remoteMessage.messageId || (Date.now() + Math.random().toString(36).substr(2, 9)),
          type: notificationType,
          title: title,
          message: body,
          body: body,
          data: data,
          timestamp: new Date().toISOString(),
          read: false,
          image: data.image
        };
        await addNotification(storageNotification);
        console.log('✅ Background notification saved to local storage');
      } catch (saveError) {
        console.error('❌ Failed to save background notification:', saveError);
      }

      // 🎯 Type Identification
      const isDataOnly = !remoteMessage.notification;
      const isReminderNotif =
        notificationType === 'admin_reminder' ||
        notificationType === 'employee_due_reminder' ||
        notificationType === 'employee_reminder_to_admin' ||
        notificationType === 'reminder' ||
        data.category === 'reminder' ||
        !!data.alertId;

      // 🎯 Professional Popup Queuing (Background -> Foreground)
      if (isReminderNotif) {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const existingRaw = await AsyncStorage.getItem('pendingNotificationData');
          const newId = data.alertId || data.reminderId || data._id;
          let shouldQueue = true;

          // Deduplication: Only queue if same ID hasn't been queued in last 30 seconds
          if (existingRaw && newId) {
            try {
              const existing = JSON.parse(existingRaw);
              const existingId = existing?.data?.alertId || existing?.data?.reminderId || existing?.data?._id;
              const ageMs = Date.now() - (existing?.timestamp || 0);
              if (existingId === newId && ageMs < 30000) {
                console.log(`⏭️ Skipping duplicate background popup queue for ID: ${newId} (${Math.round(ageMs / 1000)}s ago)`);
                shouldQueue = false;
              }
            } catch (_) { }
          }

          if (shouldQueue) {
            // Determine popup type for background context
            const isAlert = /alert|emergency|urgent/i.test(notificationType) || data.category === 'alert';
            const isAdminRem = !isAlert && (
              notificationType === 'admin_reminder' ||
              notificationType === 'employee_reminder_to_admin' ||
              data.category === 'reminder' ||
              !!data.alertId
            );
            const bgPopupType = isAlert ? 'alert' : (isAdminRem ? 'admin_reminder' : 'reminder');

            const popupData = {
              triggerReminderPopup: true,
              data: {
                reminderId: data.reminderId || data._id || Date.now().toString(),
                title: data.reminderTitle || data.title || title || 'Reminder',
                clientName: data.clientName || '',
                note: data.note || data.body || body || '',
                name: data.clientName || '',
                reminderDateTime: data.scheduledAt || data.scheduledDateTime || data.reminderTime || data.timestamp || new Date().toISOString(),
                nextScheduledAt: data.nextScheduledAt || '',
                scheduledAt: data.scheduledAt || data.scheduledDateTime || '',
                // 🔥 Use the calculated popupType from earlier to ensure theme consistency
                type: bgPopupType,
                ...data
              },
              timestamp: Date.now()
            };
            await AsyncStorage.setItem('pendingNotificationData', JSON.stringify(popupData));
            console.log(`✅ Registered background popup flag for ${notificationType}`);
          }
        } catch (e) { console.log('⚠️ Failed to store popup flag:', e.message); }
      }

      // 🎯 DEDUPLICATION (Background Displays): 
      // If the message contains a 'notification' object, Android shows it AUTOMATICALLY.
      // Calling displayNotification() now would create a DUPLICATE in the tray.
      // We only call it if it's data-only OR if it's a critical reminder where we want to 
      // attempt to replace the system one with our RICH formatted version.
      // HOWEVER, if the user sees "2-2", it's safer to skip manual display for notification-block messages.
      if ((isReminderNotif || (isDataOnly && (data.title || data.body || data.message))) && isDataOnly) {
        const isAlert = /alert|emergency|urgent/i.test(title) || /alert|emergency|urgent/i.test(notificationType) || /alert/i.test(data.category);
        const isAdminRem = !isAlert && (notificationType === 'admin_reminder' || notificationType === 'reminder' || data.category === 'reminder' || !!data.alertId);

        // 🎯 Determine Channel
        let channelId = 'gharplot_alerts';
        let channelName = 'Gharplot Alerts';
        if (notificationType === 'employee_due_reminder') {
          channelId = 'enquiry_reminders';
          channelName = 'Reminders';
        } else if (isAdminRem) {
          channelId = 'admin_reminders';
          channelName = 'Admin Reminders';
        }

        await notifee.createChannel({
          id: channelId,
          name: channelName,
          importance: 4,
          sound: 'default',
          vibration: true,
        });

        let notifTitle = title;
        let notifBody = body || 'You have a reminder';

        // Apply specific formatting
        if (notificationType === 'employee_due_reminder') {
          notifTitle = (title === 'Notification') ? `⏰ Reminder Due` : `⏰ ${title}`;
          notifBody = body || data.body || 'Your scheduled reminder is due';
        } else if (notificationType === 'admin_reminder' || notificationType === 'employee_reminder_to_admin' || notificationType === 'reminder' || data.reminderTitle) {
          const employeeName = data.employeeName || '';
          const reminderTitle = data.reminderTitle || title || 'Reminder';
          const clientName = data.clientName || '';

          if (employeeName && employeeName !== 'Employee' && employeeName !== 'System') {
            notifTitle = `🔔 ${employeeName} - Reminder`;
          } else {
            notifTitle = (title === 'Notification') ? `🔔 Reminder` : `🔔 ${title}`;
          }
          notifBody = reminderTitle + (clientName && clientName !== 'Client' ? ` | ${clientName}` : '');
        }

        const prefix = isAlert ? 'alert_' : (isAdminRem ? 'reminder_' : 'notif_');
        const rawId = data.reminderId || data._id || data.alertId;
        // 🔥 CHANGED: Add timestamp to make each notification unique so they don't replace each other
        const uniqueTimestamp = Date.now();
        const unifiedId = rawId ? `${prefix}${rawId}_${uniqueTimestamp}` : (remoteMessage.messageId || `${uniqueTimestamp}`);

        // 🔥 RICH FORMATTING: Add scheduled time & next scheduled time at bottom
        let richBody = notifBody;

        // Format time as h:mm AM/PM
        const _fmtTimeBg = (isoStr) => {
          try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return null;
            let h = d.getHours();
            const m = String(d.getMinutes()).padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            if (h === 0) h = 12;
            return `${h}:${m} ${ampm}`;
          } catch (_) { return null; }
        };

        // Scheduled time (clock icon)
        const _scheduledIsoBg = data.scheduledAt || data.scheduledDateTime;
        if (_scheduledIsoBg) {
          const formatted = _fmtTimeBg(_scheduledIsoBg);
          if (formatted) richBody = `${richBody}\n⏰ Scheduled: ${formatted}`;
        } else if (data.date && data.time) {
          try {
            let timeStr = typeof data.time === 'object'
              ? `${String(data.time.hour || 0).padStart(2, '0')}:${String(data.time.minute || 0).padStart(2, '0')}`
              : String(data.time);
            richBody = `${richBody}\n⏰ Scheduled: ${timeStr}`;
          } catch (e) { }
        }

        // Next scheduled (repeat icon)
        if (data.nextScheduledAt) {
          try {
            const nextFormatted = _fmtTimeBg(data.nextScheduledAt);
            if (nextFormatted) richBody = `${richBody}\n🔁 Next: ${nextFormatted}`;
          } catch (e) { }
        }

        // Period (hourglass icon)
        if (data.period) {
          richBody = `${richBody}\n⏳ In ${data.period}`;
        }

        // 🛡️ DEDUPLICATION (Background Admin Alert Only): 
        // Prevent duplicate tray alerts from dual FCM receipt or FCM+Local race.
        const cleanAlertId = data.alertId ? String(data.alertId).replace(/^(alert_|notif_)/, '') : null;
        if (cleanAlertId && !shouldShowAlert(cleanAlertId)) {
          console.log(`🛡️ [DE-DUP] Skipping background tray notification for duplicate alert: ${cleanAlertId}`);
          return;
        }

        console.log(`📩 [BG] FCM received for alert: ${cleanAlertId || 'no-alertId'}`);

        await notifee.displayNotification({
          id: unifiedId,
          title: notifTitle,
          body: richBody,
          android: {
            channelId: channelId,
            pressAction: { id: 'default' },
            fullScreenAction: { id: 'default' },
            importance: 4,
            sound: 'default',
            vibrationPattern: [300, 500],
            onlyAlertOnce: false, // 🔥 CHANGED: Allow sound/vibration for each notification
            showWhen: true, // 🔥 ADDED: Show timestamp
            autoCancel: true, // 🔥 ADDED: Auto-dismiss when tapped
            // timeoutAfter: 10000, // 🔥 REMOVED: Notification will stay until user dismisses manually
            style: {
              type: 1, // AndroidStyle.BIGTEXT
              text: richBody,
            },
          },
          data: { type: notificationType, ...data },
        });
        console.log(`✅ [BG] Notification ${unifiedId} displayed (stays until user dismisses)`);
      } else {
        console.log(`⏭️ Skipping manual Notifee display in background (isDataOnly: ${isDataOnly}, isReminder: ${isReminderNotif}). System either handles it or no display logic matched.`);
      }

    } catch (error) {
      console.error('❌ Error in background message handler:', error);
    }
};

/**
 * Setup background notification handler (legacy wrapper - now uses backgroundMessageHandler)
 * Kept for backward compatibility if called elsewhere.
 */
export const setupBackgroundNotificationHandler = () => {
  console.log('🚀 FCM: Background Handler Registered (via setupBackgroundNotificationHandler)');
  messaging().setBackgroundMessageHandler(backgroundMessageHandler);
};

/**
 * Listen for FCM token refresh
 * Token can refresh when app is restored, reinstalled, or user clears data
 */
export const setupTokenRefreshListener = (onTokenRefresh) => {
  const unsubscribe = messaging().onTokenRefresh(async (token) => {
    console.log('🔄 FCM Token refreshed:', token);

    // Store new token
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    console.log('💾 New FCM Token saved to AsyncStorage');

    // Call callback if provided (e.g., to send to backend)
    if (onTokenRefresh && typeof onTokenRefresh === 'function') {
      onTokenRefresh(token);
    }
  });

  return unsubscribe;
};

/**
 * Handle notification tap when app is in background/quit state
 * @param {Function} handler - Callback to handle notification data
 */
export const setupNotificationOpenedListener = (handler) => {
  // Notification opened when app is in background
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('🔔 Notification opened (background):', remoteMessage);
    if (handler && typeof handler === 'function') {
      handler(remoteMessage);
    }
  });

  // Notification opened when app was quit
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('🔔 Notification opened (quit state):', remoteMessage);
        if (handler && typeof handler === 'function') {
          handler(remoteMessage);
        }
      }
    });
};

/**
 * Create default notification channel (Android only)
 * Required for Android 8.0+ to display notifications
 */
export const createNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    // Note: This requires @notifee/react-native package for advanced channel management
    // For basic FCM, the channel is created automatically when first notification arrives
    console.log('📱 Android notification channel will be created automatically');
  }
};

/**
 * Check if FCM is properly configured
 */
export const checkFCMConfiguration = async () => {
  try {
    console.log('🔍 Checking FCM configuration...');
    const results = {
      configured: false,
      details: {},
      errors: [],
      warnings: []
    };

    // Check if Firebase is initialized
    try {
      const app = messaging().app;
      console.log('✅ Firebase app initialized:', app.name);
      results.details.firebaseInit = true;
    } catch (firebaseError) {
      console.error('❌ Firebase initialization failed:', firebaseError);
      results.errors.push('Firebase not initialized: ' + firebaseError.message);
      results.details.firebaseInit = false;
      return { ...results, error: 'Firebase initialization failed' };
    }

    // Check permissions with better error handling
    try {
      const authStatus = await messaging().requestPermission();
      const hasPermission = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      results.details.permissions = {
        status: authStatus,
        granted: hasPermission
      };

      if (!hasPermission) {
        console.warn('⚠️ Notification permissions not granted, status:', authStatus);
        results.warnings.push(`Notification permissions not granted (status: ${authStatus})`);
        results.details.permissionWarning = true;
      } else {
        console.log('✅ Notification permissions granted');
      }
    } catch (permissionError) {
      console.error('❌ Permission check failed:', permissionError);
      results.errors.push('Permission check failed: ' + permissionError.message);
      results.details.permissions = { error: permissionError.message };
    }

    // Try to get token with retry logic
    let token = null;
    try {
      console.log('🎫 Attempting to get FCM token...');
      token = await messaging().getToken();

      if (!token) {
        console.warn('⚠️ FCM token is null - retrying...');
        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        token = await messaging().getToken();
      }

      if (token) {
        console.log('✅ FCM token obtained:', token.substring(0, 20) + '...');
        results.details.token = {
          available: true,
          preview: token.substring(0, 20) + '...',
          length: token.length
        };
      } else {
        console.warn('⚠️ Unable to get FCM token after retry');
        results.warnings.push('FCM token not available - check Google Play Services and network');
        results.details.token = { available: false };
      }
    } catch (tokenError) {
      console.error('❌ Token generation failed:', tokenError);
      results.errors.push('Token generation failed: ' + tokenError.message);
      results.details.token = { error: tokenError.message };
    }

    // Check device capabilities
    try {
      const isGooglePlayServicesAvailable = await messaging().hasPermission();
      results.details.googlePlayServices = isGooglePlayServicesAvailable !== -1;

      if (!results.details.googlePlayServices) {
        results.warnings.push('Google Play Services may not be available');
      }
    } catch (playServicesError) {
      console.warn('⚠️ Could not check Google Play Services:', playServicesError);
      results.details.googlePlayServices = 'unknown';
    }

    // Determine overall configuration status
    const hasErrors = results.errors.length > 0;
    const hasToken = results.details.token?.available === true;
    const hasPermissions = results.details.permissions?.granted === true;

    if (!hasErrors && hasToken && hasPermissions) {
      results.configured = true;
      console.log('✅ FCM is fully configured and working');
    } else if (!hasErrors && (hasToken || hasPermissions)) {
      results.configured = 'partial';
      console.log('⚠️ FCM is partially configured');
    } else {
      results.configured = false;
      console.log('❌ FCM configuration has issues');
    }

    return { ...results, token };

  } catch (error) {
    console.error('❌ FCM configuration check failed:', error);
    return {
      configured: false,
      error: error.message,
      errors: [error.message],
      details: { generalError: true }
    };
  }
};

/**
 * Send FCM token to backend for storage
 * Saves to BOTH User and Employee models for complete coverage
 */
export const sendTokenToBackend = async (userId, token) => {
  try {
    if (!userId || !token) {
      console.warn('⚠️ Missing userId or token for backend sync');
      return false;
    }

    console.log('📤 Sending FCM token to backend...');

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Check if current user is admin
    const adminId = await AsyncStorage.getItem('adminId');
    const isAdminUser = !!adminId;

    if (isAdminUser) {
      // 1️⃣ Admin: ONLY save to Admin model — never call save-employee-token
      // (save-employee-token clears Admin tokens, causing missed push notifications)
      try {
        const adminResponse = await fetch('https://gharplotbackend.gntechnology.de/api/save-admin-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId: adminId, fcmToken: token }),
          signal: controller.signal
        });
        if (adminResponse.ok) {
          console.log('✅ FCM token saved to Admin model');
        } else {
          console.warn('⚠️ Admin token save response not ok');
        }
      } catch (adminError) {
        console.warn('⚠️ Admin token save failed:', adminError.message);
      }
    } else {
      // 1️⃣ User/Employee: Save to User model
      try {
        const userResponse = await fetch('https://gharplotbackend.gntechnology.de/api/save-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, fcmToken: token, platform: Platform.OS }),
          signal: controller.signal
        });
        if (userResponse.ok) {
          console.log('✅ FCM token saved to User model');
        }
      } catch (userError) {
        console.warn('⚠️ User token save failed:', userError.message);
      }

      // 2️⃣ Save to Employee model
      try {
        const employeeResponse = await fetch('https://gharplotbackend.gntechnology.de/api/save-employee-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: userId, fcmToken: token }),
        });
        if (employeeResponse.ok) {
          console.log('✅ FCM token saved to Employee model');
        }
      } catch (empError) {
        console.warn('⚠️ Employee token save failed (user might not be employee):', empError.message);
      }
    }

    clearTimeout(timeoutId);

    await AsyncStorage.setItem('fcm_token_synced', 'true');
    return true;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('⚠️ FCM token request timed out');
    } else if (error.message.includes('Network request failed')) {
      console.warn('⚠️ Network error while sending FCM token - backend may be offline');
    } else {
      console.warn('⚠️ Failed to send FCM token to backend:', error.message);
    }
    // Don't throw error to prevent app crash
    return false;
  }
};

/**
 * Initialize FCM service with enhanced reminder notification support
 * Call this once when app starts
 * @param {Function} onTokenRefresh - Optional callback for token refresh
 * @param {Function} onNotificationOpened - Optional callback for notification opened
 * @returns {Object} Cleanup functions and configuration status
 */
export const initializeFCM = async (onTokenRefresh, onNotificationOpened) => {
  console.log('🚀 Initializing FCM Service with reminder support...');

  try {
    // Clear old displayed (stale) tray notifications on startup.
    // Delay to give user time to see notifications that arrived while app was killed.
    setTimeout(async () => {
      try {
        const notifee = require('@notifee/react-native').default;
        const displayed = await notifee.getDisplayedNotifications();
        const now = Date.now();
        // Only cancel notifications older than 5 minutes (stale ones)
        for (const n of displayed) {
          const nTimestamp = n.notification?.data?.timestamp
            ? new Date(n.notification.data.timestamp).getTime()
            : 0;
          if (nTimestamp && (now - nTimestamp) > 5 * 60 * 1000) {
            await notifee.cancelNotification(n.id);
          }
        }
        await notifee.cancelTriggerNotifications(); // Clean up any leftover local triggers
        console.log('🧹 Cleared stale tray notifications and leftover local triggers.');
      } catch (err) {
        console.log('⚠️ Could not cancel previous notifications:', err.message);
      }
    }, 3000);

    // First check if FCM is properly configured
    const configCheck = await checkFCMConfiguration();
    if (!configCheck.configured) {
      console.error('❌ FCM not properly configured:', configCheck.error);

      // Show user-friendly error
      CrossPlatformAlert.alert(
        'Notification Setup',
        'Push notifications need to be enabled for the best experience. Please enable notifications in your device settings.',
        [{ text: 'OK' }]
      );

      return {
        configured: false,
        token: null,
        cleanup: () => { },
        error: configCheck.error
      };
    }

    // Background handler is now registered at top-level in index.js for killed-state support.
    // Do NOT call setupBackgroundNotificationHandler() here - it would be too late for killed state.

    // Get FCM token
    const token = await getFCMToken();

    if (token) {
      console.log('✅ FCM token obtained:', token.substring(0, 20) + '...');

      // Try to send token to backend (non-blocking)
      setTimeout(async () => {
        try {
          const userId = await AsyncStorage.getItem('userId');
          const adminId = await AsyncStorage.getItem('adminId');
          const effectiveId = userId || adminId;
          if (effectiveId) {
            const success = await sendTokenToBackend(effectiveId, token);
            if (!success) {
              console.log('ℹ️ FCM token sync to backend skipped - will retry later');
            }
          } else {
            console.log('ℹ️ No userId/adminId found - FCM token will be synced after login');
          }
        } catch (syncError) {
          console.warn('⚠️ Token sync to backend failed (non-critical):', syncError.message);
        }
      }, 2000); // Delay by 2 seconds to not block app startup
    }

    // Setup listeners
    const unsubscribeForeground = setupForegroundNotificationHandler();
    const unsubscribeTokenRefresh = setupTokenRefreshListener(async (newToken) => {
      console.log('🔄 FCM Token refreshed:', newToken.substring(0, 20) + '...');

      // Call user callback
      if (onTokenRefresh && typeof onTokenRefresh === 'function') {
        onTokenRefresh(newToken);
      }

      // Send updated token to backend
      try {
        const userId = await AsyncStorage.getItem('userId');
        const adminId = await AsyncStorage.getItem('adminId');
        const effectiveId = userId || adminId;
        if (effectiveId) {
          await sendTokenToBackend(effectiveId, newToken);
        }
      } catch (syncError) {
        console.warn('⚠️ Updated token sync to backend failed:', syncError.message);
      }
    });

    setupNotificationOpenedListener(onNotificationOpened);

    console.log('✅ FCM Service initialized successfully');

    // Return cleanup function
    return {
      token,
      configured: true,
      cleanup: () => {
        if (unsubscribeForeground) unsubscribeForeground();
        if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
      },
    };

  } catch (error) {
    console.error('❌ FCM initialization failed:', error);

    CrossPlatformAlert.alert(
      'Notification Error',
      'There was an issue setting up push notifications. Some features may not work properly.',
      [{ text: 'OK' }]
    );

    return {
      token: null,
      configured: false,
      error: error.message,
      cleanup: () => { }
    };
  }
};

/**
 * Create reminder notification payload for FCM
 * Helper function to format reminder notifications consistently
 * @param {Object} reminderData - Reminder information
 * @returns {Object} Formatted FCM notification payload
 */
export const createReminderNotificationPayload = (reminderData) => {
  const { clientName, note, phoneNumber, enquiryId, reminderId, assignedTo } = reminderData;

  return {
    notification: {
      title: '⏰ रिमाइंडर',
      body: `${clientName || 'Client'} को कॉल करने का समय${note ? ` - ${note}` : ''}`,
      sound: 'default',
      priority: 'high'
    },
    data: {
      type: 'reminder',
      reminderId: String(reminderId || ''),
      enquiryId: String(enquiryId || ''),
      clientName: clientName || '',
      phoneNumber: phoneNumber || '',
      note: note || '',
      action: 'view_reminder',
      timestamp: new Date().toISOString()
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'enquiry_reminders',
        priority: 'max',
        defaultSound: true,
        defaultVibratePattern: true
      }
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
          alert: {
            title: '⏰ रिमाइंडर',
            body: `${clientName || 'Client'} को कॉल करने का समय`
          }
        }
      }
    }
  };
};

/**
 * Test reminder notification 
 * For debugging reminder notifications in development
 * @param {Object} testData - Test reminder data
 */
export const testReminderNotification = async (testData = {}) => {
  if (!__DEV__) {
    console.warn('⚠️ Test notifications only available in development mode');
    return;
  }

  try {
    const token = await getFCMToken();
    if (!token) {
      console.error('❌ No FCM token available for testing');
      return;
    }

    const reminderData = {
      clientName: testData.clientName || 'Test Client',
      note: testData.note || 'Test reminder call',
      phoneNumber: testData.phoneNumber || '9999999999',
      enquiryId: testData.enquiryId || 'test-enquiry-123',
      reminderId: testData.reminderId || 'test-reminder-123',
      assignedTo: testData.assignedTo || 'test-user'
    };

    const payload = createReminderNotificationPayload(reminderData);

    console.log('🧪 Test reminder notification payload created:');
    console.log(JSON.stringify(payload, null, 2));

    // In a real scenario, this payload would be sent to your FCM backend endpoint
    // For testing, you can manually trigger the foreground handler
    const { setupForegroundNotificationHandler } = require('./fcmService');

    CrossPlatformAlert.alert(
      'Test Reminder Notification',
      `Test reminder created for ${reminderData.clientName}\nIn production, this would be sent via FCM backend.`,
      [{ text: 'OK' }]
    );

    return payload;
  } catch (error) {
    console.error('❌ Test reminder notification failed:', error);
  }
};

