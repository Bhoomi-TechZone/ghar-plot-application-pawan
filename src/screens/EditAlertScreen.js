/**
 * EditAlertScreen.js
 * Screen for editing existing alerts from notifications
 * User can modify alert reason/message and reschedule it
 * Uses FCM API for backend updates
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import { updateAlert, updateReminder, BASE_URL } from '../services/api';
import { deleteAlert, getAlertById } from '../crm/services/crmAlertApi'; // 🔥 Import deleteAlert, getAlertById
import DateTimePicker from '@react-native-community/datetimepicker';
import { getFCMToken } from '../utils/fcmService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertNotificationService from '../services/AlertNotificationService';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

const EditAlertScreen = ({ route, navigation }) => {
  const { 
    alertId, 
    originalTitle, 
    originalReason, 
    originalDate, 
    originalTime, 
    repeatDaily, 
    repeatFrequency: origRepeatFreq, 
    customIntervalMinutes: origCustomMins,
    scheduledDateTime, // 🔥 Get the scheduled date from params
    repeatMetadata: origRepeatMetadata, // 🔥 FIX: Get existing repeatMetadata to preserve it
    placeReminder: initialPlaceReminderParam,
  } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [placeReminder, setPlaceReminder] = useState(
    initialPlaceReminderParam !== undefined
      ? (initialPlaceReminderParam === true || initialPlaceReminderParam === 'true')
      : true
  );
  const [title, setTitle] = useState(originalTitle || '');
  const [reason, setReason] = useState(originalReason || '');
  // 🔥 KEY FIX: Initialize scheduledDate correctly to avoid timezone double-conversion.
  // The backend stores `time` as the user's IST time string (e.g. '13:27').
  // `scheduledDateTime` / `nextScheduledAt` is a UTC ISO string used only for the DATE part.
  // We must NOT use scheduledDateTime for the time portion since that would apply UTC→IST
  // conversion on top of an already-IST time, showing the wrong hour.
  const [scheduledDate, setScheduledDate] = useState(() => {
    // Parse the time from originalTime (already IST, e.g. '13:27')
    // This is the source of truth for what the user set.
    const parseTimeFromString = (timeStr) => {
      if (!timeStr) return null;
      const parts = timeStr.split(':');
      if (parts.length < 2) return null;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return null;
      return { hours, minutes };
    };

    // Parse the date from scheduledDateTime / nextScheduledAt (UTC ISO string)
    // Only extract the local DATE portion (year, month, day) from this.
    const parseDateFromISO = (isoStr) => {
      if (!isoStr) return null;
      try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return null;
        // Return date components in local timezone (IST on device)
        return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
      } catch (_) { return null; }
    };

    // Parse the date from originalDate (YYYY-MM-DD or ISO string, no timezone shift needed)
    const parseDateFromString = (dateStr) => {
      if (!dateStr) return null;
      try {
        // Handle both 'YYYY-MM-DD' and ISO strings
        // For 'YYYY-MM-DD', construct without timezone to get local midnight
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return { year, month, day };
          }
        }
        return null;
      } catch (_) { return null; }
    };

    // 1. Get time from originalTime (most reliable — stored as IST by backend)
    const timeParts = parseTimeFromString(originalTime);

    // 2. Get date: prefer scheduledDateTime/nextScheduledAt for correct future date,
    //    fall back to originalDate
    const dateParts = parseDateFromISO(scheduledDateTime) || parseDateFromString(originalDate);

    if (timeParts && dateParts) {
      const result = new Date(dateParts.year, dateParts.month, dateParts.day, timeParts.hours, timeParts.minutes, 0, 0);
      console.log('📅 EditAlert: Initialized from originalTime + scheduledDateTime date part:', result.toLocaleString());
      return result;
    }

    // Fallback: use scheduledDateTime as-is (device will display in local IST automatically)
    if (scheduledDateTime) {
      const d = new Date(scheduledDateTime);
      if (!isNaN(d.getTime())) {
        console.log('📅 EditAlert: Fallback - using scheduledDateTime directly:', d.toLocaleString());
        return d;
      }
    }

    console.log('⚠️ EditAlert: No valid date found, using current date');
    return new Date();
  });

  // Parse repeatMetadata if passed as JSON string
  const parsedRepeatMetadata = (() => {
    if (!origRepeatMetadata) return null;
    if (typeof origRepeatMetadata === 'object') return origRepeatMetadata;
    if (typeof origRepeatMetadata === 'string') {
      try {
        return JSON.parse(origRepeatMetadata);
      } catch (_) {
        return null;
      }
    }
    return null;
  })();

  const initialCustomMins = 
    (origCustomMins ? String(origCustomMins) : '') ||
    (route.params?.customRepeatMinutes ? String(route.params.customRepeatMinutes) : '') ||
    (route.params?.customIntervalMinutes ? String(route.params.customIntervalMinutes) : '') ||
    (route.params?.repeatInterval ? String(route.params.repeatInterval) : '') ||
    (parsedRepeatMetadata?.customIntervalMinutes ? String(parsedRepeatMetadata.customIntervalMinutes) : '') ||
    (parsedRepeatMetadata?.customRepeatMinutes ? String(parsedRepeatMetadata.customRepeatMinutes) : '') ||
    '';

  const [repeatFrequency, setRepeatFrequency] = useState(() => {
    if (origRepeatFreq && origRepeatFreq !== 'none') return origRepeatFreq;
    if (initialCustomMins) return 'custom';
    if (repeatDaily === 'true' || repeatDaily === true || route.params?.repeatDaily) return 'daily';
    return origRepeatFreq || 'none';
  });

  const [customIntervalMinutes, setCustomIntervalMinutes] = useState(initialCustomMins);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showCustomManualInput, setShowCustomManualInput] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

  // Track if changes are saved or being discarded to avoid redundant prompts
  const isSavedRef = useRef(false);
  const initialValuesRef = useRef({
    title: originalTitle || '',
    reason: originalReason || '',
    repeatFrequency: origRepeatFreq || 'none',
    customIntervalMinutes: initialCustomMins || '',
  });

  const hasUnsavedChanges = () => {
    if (isSavedRef.current) return false;
    const init = initialValuesRef.current;
    const currentTitle = (title || '').trim();
    const currentReason = (reason || '').trim();
    const initTitle = (init.title || '').trim();
    const initReason = (init.reason || '').trim();

    return currentTitle !== initTitle || 
           currentReason !== initReason ||
           repeatFrequency !== init.repeatFrequency ||
           String(customIntervalMinutes || '') !== String(init.customIntervalMinutes || '');
  };

  // 🔥 Intercept back press (hardware back, header arrow, gesture) when user has unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges()) {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Prompt the user before leaving the screen
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              isSavedRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, title, reason, repeatFrequency, customIntervalMinutes]);

  // 🔥 Cleanup pickers on unmount to prevent errors
  useEffect(() => {
    return () => {
      setShowDatePicker(false);
      setShowTimePicker(false);
    };
  }, []);

  useEffect(() => {
    if (!alertId) {
      CrossPlatformAlert.alert('Error', 'Invalid alert ID');
      navigation.goBack();
      return;
    }

    // Fetch full alert from backend to populate any missing repeat details or verify
    const fetchAlertData = async () => {
      try {
        const cleanId = String(alertId).replace(/^(alert_|reminder_)/, '');
        const res = await getAlertById(cleanId);
        const data = res?.alert || res?.data;
        if (data) {
          if (data.placeReminder !== undefined) {
            setPlaceReminder(data.placeReminder !== false);
          }
          if (!title && data.title) setTitle(data.title);
          if (!reason && data.reason) setReason(data.reason);

          let meta = data.repeatMetadata;
          if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (_) { meta = null; }
          }
          const mins = meta?.customIntervalMinutes || 
                       meta?.customRepeatMinutes || 
                       data.customRepeatMinutes || 
                       data.customIntervalMinutes || 
                       data.repeatInterval;

          const freq = data.repeatFrequency || 
                       (data.repeatDaily ? 'daily' : (mins ? 'custom' : 'none'));

          if (freq && freq !== 'none') {
            setRepeatFrequency(freq);
          }

          if (mins) {
            setCustomIntervalMinutes(String(mins));
            if (!freq || freq === 'none') {
              setRepeatFrequency('custom');
            }
          }

          // Update initial baseline values
          initialValuesRef.current = {
            title: data.title || title || '',
            reason: data.reason || reason || '',
            repeatFrequency: freq || repeatFrequency,
            customIntervalMinutes: mins ? String(mins) : (customIntervalMinutes ? String(customIntervalMinutes) : ''),
          };
        }
      } catch (e) {
        console.log('⚠️ EditAlertScreen: Note - using route params for alert:', e.message);
      }
    };

    fetchAlertData();
  }, [alertId]);

  const handleDateChange = (event, selectedDate) => {
    // Always hide picker first on Android to prevent unmount errors
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    if (selectedDate) {
      const newDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        scheduledDate.getHours(),
        scheduledDate.getMinutes()
      );
      setScheduledDate(newDate);
    }
    
    // Hide picker for iOS after selection
    if (Platform.OS === 'ios') {
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    // Always hide picker first on Android to prevent unmount errors
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }
    
    if (selectedTime) {
      const newDate = new Date(
        scheduledDate.getFullYear(),
        scheduledDate.getMonth(),
        scheduledDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
      setScheduledDate(newDate);
    }
    
    // Hide picker for iOS after selection
    if (Platform.OS === 'ios') {
      setShowTimePicker(false);
    }
  };

  const formatDateTime = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return `${day}/${month}/${year} at ${hours}:${minutes} ${ampm}`;
  };

  // Get readable repeat label
  const getRepeatLabel = () => {
    if (repeatFrequency === 'custom') {
      const mins = parseInt(customIntervalMinutes, 10);
      if (!isNaN(mins) && mins > 0) {
        if (mins >= 60) {
          const hours = Math.floor(mins / 60);
          const remainingMins = mins % 60;
          return remainingMins > 0 
            ? `Every ${hours}h ${remainingMins}m` 
            : `Every ${hours} hour${hours > 1 ? 's' : ''}`;
        }
        return `Every ${mins} minute${mins > 1 ? 's' : ''}`;
      }
      return 'Every 2 hours';
    }
    const labels = {
      none: 'Does not repeat',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    return labels[repeatFrequency] || 'Does not repeat';
  };

  // Handle repeat option selection
  const handleRepeatSelect = (frequency) => {
    setRepeatFrequency(frequency);
    if (frequency === 'custom') {
      setShowCustomInput(true);
    } else {
      setCustomIntervalMinutes('');
      setShowCustomInput(false);
      setShowRepeatModal(false);
    }
  };

  // Preset custom interval options
  const customIntervalOptions = [
    { label: '10 Minutes', value: 10 },
    { label: '30 Minutes', value: 30 },
    { label: '1 Hour', value: 60 },
    { label: '2 Hours', value: 120 },
    { label: '3 Hours', value: 180 },
    { label: '4 Hours', value: 240 },
    { label: '5 Hours', value: 300 },
    { label: '6 Hours', value: 360 },
    { label: '7 Hours', value: 420 },
    { label: '8 Hours', value: 480 },
    { label: '9 Hours', value: 540 },
    { label: '10 Hours', value: 600 },
    { label: '11 Hours', value: 660 },
  ];

  const handleCustomIntervalSelect = (minutes) => {
    setCustomIntervalMinutes(minutes);
    setShowCustomInput(false);
    setShowCustomManualInput(false);
    setShowRepeatModal(false);
  };

  const handleManualMinutesChange = (value) => {
    const val = value.replace(/[^0-9]/g, '');
    setManualMinutes(val);
  };

  const confirmManualMinutes = () => {
    const mins = parseInt(manualMinutes) || 60;
    handleCustomIntervalSelect(mins > 0 ? mins : 60);
  };

  const handleTogglePlaceReminder = async (newVal) => {
    setPlaceReminder(newVal);
    // Option A: Immediate auto-save on toggle for instant persistence
    try {
      const cleanId = String(alertId).replace(/^(alert_|reminder_)/, '');
      const autoSavePayload = {
        title: title.trim(),
        reason: reason.trim(),
        comment: reason.trim(),
        note: reason.trim(),
        isActive: newVal,
        placeReminder: newVal,
      };
      let saved = false;
      try {
        const resAlert = await updateAlert(cleanId, autoSavePayload);
        if (resAlert && resAlert.success !== false) saved = true;
      } catch (_) {}
      if (!saved) {
        try {
          await updateReminder(cleanId, autoSavePayload);
          saved = true;
        } catch (_) {}
      }
      console.log(`✅ [Option A] Auto-saved alert placeReminder = ${newVal}`);
    } catch (autoErr) {
      console.warn('⚠️ Auto-save error on alert toggle:', autoErr?.message);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter alert title');
      return;
    }
    
    if (!reason.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter alert reason/message');
      return;
    }

    if (placeReminder) {
      const now = new Date();
      if (scheduledDate <= now) {
        CrossPlatformAlert.alert('Invalid Date', 'Please select a future date and time');
        return;
      }
    }

    setLoading(true);

    try {
      // Format date and time for API
      const year = scheduledDate.getFullYear();
      const month = (scheduledDate.getMonth() + 1).toString().padStart(2, '0');
      const day = scheduledDate.getDate().toString().padStart(2, '0');
      const hours = scheduledDate.getHours().toString().padStart(2, '0');
      const minutes = scheduledDate.getMinutes().toString().padStart(2, '0');

      // Build repeatMetadata for weekly/monthly/yearly alerts
      let repeatMetadata = null;
      if (repeatFrequency === 'weekly') {
        repeatMetadata = { dayOfWeek: scheduledDate.getDay() };
      } else if (repeatFrequency === 'monthly') {
        repeatMetadata = { dayOfMonth: scheduledDate.getDate() };
      } else if (repeatFrequency === 'yearly') {
        repeatMetadata = { 
          dayOfMonth: scheduledDate.getDate(),
          month: scheduledDate.getMonth() + 1
        };
      } else if (repeatFrequency === 'custom' && customIntervalMinutes) {
        // 🔥 FIX: Add customIntervalMinutes to repeatMetadata for custom frequency
        repeatMetadata = { customIntervalMinutes: customIntervalMinutes };
      } else if (repeatFrequency === 'custom' && !customIntervalMinutes && origRepeatMetadata) {
        // 🔥 FIX: Preserve existing repeatMetadata if user didn't change custom interval
        repeatMetadata = origRepeatMetadata;
      }

      const isCustom = repeatFrequency === 'custom';
      const updateData = {
        title: title.trim(),
        reason: reason.trim(),
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
        repeatFrequency: repeatFrequency, // Use repeatFrequency as backend expects
        repeatMetadata: isCustom ? repeatMetadata : (['weekly', 'monthly', 'yearly'].includes(repeatFrequency) ? repeatMetadata : null), // Store day/month info for weekly/monthly/yearly/custom, null for daily
        customRepeatMinutes: isCustom ? customIntervalMinutes : '', // 🔥 Fix: Only pass for custom
        repeatDaily: repeatFrequency === 'daily', // 🔥 FIX: Only true for daily, NOT for custom
        isActive: placeReminder, // If reminder disabled, set inactive
        placeReminder: placeReminder,
      };

      console.log('📤 Updating alert with ID:', alertId);
      console.log('📤 Update data:', JSON.stringify(updateData, null, 2));
      
      const cleanId = String(alertId).replace(/^(alert_|reminder_)/, '');
      let result = null;
      let updateError = null;

      // Call API to update alert
      try {
        result = await updateAlert(cleanId, updateData);
      } catch (err) {
        console.log('⚠️ updateAlert failed, trying updateReminder:', err.message);
        updateError = err;
      }

      // If updateAlert failed or returned 404/false, fallback to updateReminder
      if (!result || result.success === false) {
        try {
          const reminderData = {
            title: updateData.title,
            comment: updateData.reason,
            note: updateData.reason,
            reminderDateTime: scheduledDate.toISOString(),
            isRepeating: repeatFrequency !== 'none',
            repeatType: repeatFrequency,
            customRepeatMinutes: isCustom ? Number(customIntervalMinutes) || 0 : 0,
            isActive: placeReminder,
            placeReminder: placeReminder,
          };
          result = await updateReminder(cleanId, reminderData);
        } catch (remErr) {
          console.error('❌ updateReminder also failed:', remErr.message);
          throw updateError || remErr;
        }
      }

      console.log('✅ API Response:', JSON.stringify(result, null, 2));

      // 🔥 Determine notification type based on category rather than just admin status
      const adminToken = await AsyncStorage.getItem('adminToken');
      // Use category from API result to maintain correct type (alert vs reminder)
      const alertCategory = result?.data?.category || result?.category;
      const finalNotificationType = alertCategory === 'reminder' ? 'admin_reminder' : 'alert';
      console.log(`🏷️ Category: ${alertCategory} | Notification type for reschedule: ${finalNotificationType}`);
      
      if (result && result.success !== false) {
        if (!placeReminder) {
          console.log('ℹ️ Alert updated in note mode (placeReminder: false) - skipping FCM reschedule');
          CrossPlatformAlert.alert(
            '✅ Note Updated',
            'Note updated successfully! No alerts or notifications will fire for this entry.',
            [
              {
                text: 'OK',
                onPress: () => {
                  isSavedRef.current = true;
                  navigation.goBack();
                },
              },
            ]
          );
          return;
        }

        console.log('✅ Alert updated successfully - Now scheduling FCM notification via backend');
        
        // ⚠️ CRITICAL: Call backend to reschedule FCM notification
        try {
          // Get FCM token
          const fcmToken = await getFCMToken();
          
          // Combine date and time for scheduledDateTime
          const scheduledDateTime = scheduledDate.toISOString();
          
          // Get CRM auth token (critical for alert APIs)
          const authToken = adminToken ||
                           await AsyncStorage.getItem('crm_token') ||
                           await AsyncStorage.getItem('admin_token') ||
                           await AsyncStorage.getItem('authToken') ||
                           await AsyncStorage.getItem('userToken');
          
          console.log('🔑 Auth token available:', !!authToken);
          console.log('🎯 FCM Token:', fcmToken ? fcmToken.substring(0, 20) + '...' : 'Not available');
          
          if (authToken) {
            console.log('📤 Calling backend to schedule FCM notification...');
            console.log('📅 Scheduled DateTime:', scheduledDateTime);
            
            // 🔥 FIX: Use /api/alerts/ (plural) as specified by the backend developer
            const fcmResponse = await fetch(`${BASE_URL}/api/alerts/schedule-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                alertId: alertId,
                title: title.trim(),
                reason: reason.trim(),
                date: updateData.date,
                time: updateData.time,
                scheduledDateTime: scheduledDateTime, // 🔥 Mandatory for cron
                repeatFrequency: repeatFrequency,
                repeatDaily: repeatFrequency === 'daily', // 🔥 Strictly true ONLY for daily
                repeatMetadata: updateData.repeatMetadata,
                customRepeatMinutes: customIntervalMinutes, // 🔥 Fix: Renamed for backend
                type: finalNotificationType,
                notificationType: finalNotificationType,
                fcmToken: fcmToken,
              }),
            });
            
            // Check if response is JSON before parsing
            const contentType = fcmResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const fcmResult = await fcmResponse.json();
              
              if (fcmResult.success) {
                console.log('✅ FCM notification rescheduled successfully via backend');
              } else {
                console.warn('⚠️ Backend FCM rescheduling failed:', fcmResult.message);
              }
            } else {
              const errorText = await fcmResponse.text();
              console.warn('⚠️ Backend returned non-JSON response (endpoint may not be implemented yet):', errorText.substring(0, 100));
            }
          } else {
            console.warn('⚠️ No auth token available for FCM rescheduling');
          }
        } catch (fcmError) {
          console.error('❌ Error rescheduling FCM notification:', fcmError);
          // Don't fail the whole operation
        }
        
        // 🚫 LOCAL NOTIFICATION DISABLED — Only FCM push from backend should show
        // try {
        //   console.log('📱 Scheduling local backup notification...');
        //   await AlertNotificationService.cancelAlert(alertId);
        //   const scheduleResult = await AlertNotificationService.scheduleAlert({
        //     id: alertId,
        //     date: updateData.date,
        //     time: updateData.time,
        //     title: title.trim(),
        //     reason: reason.trim(),
        //     repeatFrequency: repeatFrequency,
        //     repeatMetadata: updateData.repeatMetadata,
        //     customIntervalMinutes: customIntervalMinutes,
        //     repeatDaily: repeatFrequency === 'daily',
        //     notificationType: finalNotificationType,
        //   });
        //   if (scheduleResult.success) {
        //     console.log('✅ Local backup notification scheduled:', scheduleResult.scheduledFor);
        //   } else {
        //     console.warn('⚠️ Failed to schedule local notification:', scheduleResult.message);
        //   }
        // } catch (localError) {
        //   console.error('❌ Error scheduling local notification:', localError);
        // }
        console.log('📱 Local notification SKIPPED — relying on backend FCM only');
        
        CrossPlatformAlert.alert(
          '✅ Success',
          `Alert updated successfully!\n\n📅 New schedule: ${formatDateTime(scheduledDate)}${repeatFrequency === 'daily' ? '\n🔄 (Repeats daily)' : ''}\n\n🔔 You will receive notification at the scheduled time`,
          [
            {
              text: 'OK',
              onPress: () => {
                isSavedRef.current = true;
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        throw new Error('Failed to update alert');
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      
      // User-friendly error message
      let errorMessage = 'Failed to update alert. ';
      if (error.message.includes('404')) {
        errorMessage += 'Alert not found. It may have been deleted.';
      } else if (error.message.includes('unauthorized') || error.message.includes('401') || error.message.includes('403')) {
        errorMessage += 'Authentication failed. Please login to CRM again.';
      } else if (error.message.includes('No authentication token')) {
        errorMessage += 'Please login to CRM first.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      CrossPlatformAlert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              isSavedRef.current = true;
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      isSavedRef.current = true;
      navigation.goBack();
    }
  };

  const handleDelete = () => {
    CrossPlatformAlert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await deleteAlert(alertId);
              
              if (result.success || result.message?.includes('success')) {
                CrossPlatformAlert.alert(
                  'Success',
                  'Alert deleted successfully',
                  [{
                    text: 'OK',
                    onPress: () => {
                      isSavedRef.current = true;
                      navigation.goBack();
                    }
                  }]
                );
              } else {
                throw new Error(result.message || 'Failed to delete alert');
              }
            } catch (error) {
              console.error('❌ Delete error:', error);
              CrossPlatformAlert.alert('Error', error.message || 'Failed to delete alert');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Edit Alert</Text>
        <Text style={styles.subtitle}>Update alert details and reschedule</Text>

        {/* Alert Title */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Alert Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter alert title (e.g., Morning Reminder)"
            placeholderTextColor="#999"
          />
        </View>

        {/* Alert Message/Reason */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Alert Message *</Text>
          <TextInput
            style={styles.textArea}
            value={reason}
            onChangeText={setReason}
            placeholder="Enter alert message (e.g., Go to gym)"
            placeholderTextColor="#999"
            multiline
            numberOfLines={12}
            textAlignVertical="top"
          />
        </View>

        {/* Place a Reminder Toggle Card */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleTitle}>Place a Reminder</Text>
            <Text style={styles.toggleSubtitle}>
              {placeReminder
                ? '🔔 Remind on date & time with notification and popup'
                : '📝 Saved as note only without alerts or popups'}
            </Text>
          </View>
          <Switch
            value={placeReminder}
            onValueChange={handleTogglePlaceReminder}
            trackColor={{ false: '#d1d5db', true: '#86efac' }}
            thumbColor={placeReminder ? '#22c55e' : '#9ca3af'}
          />
        </View>

        {placeReminder ? (
          <>
            {/* Date Picker */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {scheduledDate.toLocaleDateString('en-GB')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Time Picker */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Time *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {scheduledDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Repeat Frequency Selector */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Repeat</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowRepeatModal(true)}
              >
                <Text style={styles.dateButtonText}>
                  {getRepeatLabel()}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scheduled For Display */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Alert will be scheduled for:</Text>
              <Text style={styles.infoValue}>
                {formatDateTime(scheduledDate)}
                {repeatFrequency !== 'none' && `\n(${getRepeatLabel()})`}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.noteOnlyBanner}>
            <Text style={styles.noteOnlyBannerTitle}>📝 Note Only Mode</Text>
            <Text style={styles.noteOnlyBannerText}>
              This entry is saved as a note/comment. Date & time alerts, push notifications, and popup dialogs are disabled.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, loading && styles.saveButtonDisabled]}
            onPress={handleDelete}
            disabled={loading}
          >
            <Text style={styles.deleteButtonText}>Delete Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {placeReminder ? 'Save & Reschedule' : 'Save Note'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            is24Hour={false}
          />
        )}

        {/* Repeat Frequency Modal */}
        <Modal
          visible={showRepeatModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRepeatModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => !showCustomInput && setShowRepeatModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Repeat Frequency</Text>
              
              <ScrollView 
                style={styles.repeatOptionsScroll}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <TouchableOpacity 
                  style={[styles.repeatOption, repeatFrequency === 'none' && styles.repeatOptionSelected]}
                  onPress={() => handleRepeatSelect('none')}
                >
                  <Text style={[styles.repeatOptionText, repeatFrequency === 'none' && styles.repeatOptionTextSelected]}>
                    Does not repeat
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.repeatOption, repeatFrequency === 'daily' && styles.repeatOptionSelected]}
                  onPress={() => handleRepeatSelect('daily')}
                >
                  <Text style={[styles.repeatOptionText, repeatFrequency === 'daily' && styles.repeatOptionTextSelected]}>
                    Daily
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.repeatOption, repeatFrequency === 'weekly' && styles.repeatOptionSelected]}
                  onPress={() => handleRepeatSelect('weekly')}
                >
                  <Text style={[styles.repeatOptionText, repeatFrequency === 'weekly' && styles.repeatOptionTextSelected]}>
                    Weekly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.repeatOption, repeatFrequency === 'monthly' && styles.repeatOptionSelected]}
                  onPress={() => handleRepeatSelect('monthly')}
                >
                  <Text style={[styles.repeatOptionText, repeatFrequency === 'monthly' && styles.repeatOptionTextSelected]}>
                    Monthly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.repeatOption, repeatFrequency === 'yearly' && styles.repeatOptionSelected]}
                  onPress={() => handleRepeatSelect('yearly')}
                >
                  <Text style={[styles.repeatOptionText, repeatFrequency === 'yearly' && styles.repeatOptionTextSelected]}>
                    Yearly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.repeatOption, repeatFrequency === 'custom' && styles.repeatOptionSelected]}
                  onPress={() => handleRepeatSelect('custom')}
                >
                  <Text style={[styles.repeatOptionText, repeatFrequency === 'custom' && styles.repeatOptionTextSelected]}>
                    Custom
                  </Text>
                </TouchableOpacity>

                {/* Custom Interval Preset Options */}
                {showCustomInput && (
                  <View style={styles.customIntervalContainer}>
                    <Text style={styles.customIntervalLabel}>Select interval:</Text>
                    {customIntervalOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.customOptionItem,
                          Number(customIntervalMinutes) === option.value && styles.customOptionItemSelected,
                        ]}
                        onPress={() => handleCustomIntervalSelect(option.value)}
                      >
                        <Text
                          style={[
                            styles.customOptionItemText,
                            Number(customIntervalMinutes) === option.value && styles.customOptionItemTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Add Custom manual input option */}
                    <TouchableOpacity
                      style={[styles.customOptionItem, styles.addCustomOption]}
                      onPress={() => setShowCustomManualInput(!showCustomManualInput)}
                    >
                      <Text style={styles.addCustomOptionText}>+ Add Custom</Text>
                    </TouchableOpacity>

                    {showCustomManualInput && (
                      <View style={styles.manualInputContainer}>
                        <Text style={styles.manualInputLabel}>Enter minutes:</Text>
                        <View style={styles.manualInputRow}>
                          <TextInput
                            style={styles.manualInput}
                            keyboardType="numeric"
                            value={manualMinutes}
                            onChangeText={handleManualMinutesChange}
                            placeholder="e.g. 45"
                            placeholderTextColor="#9ca3af"
                          />
                          <Text style={styles.manualInputUnit}>min</Text>
                          <TouchableOpacity
                            style={styles.manualConfirmButton}
                            onPress={confirmManualMinutes}
                          >
                            <Text style={styles.manualConfirmText}>OK</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {!showCustomInput && (
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowRepeatModal(false)}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 360,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  switchSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 25,
  },
  infoLabel: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#ff9800',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  repeatOptionsScroll: {
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  repeatOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  repeatOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  repeatOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  repeatOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Custom interval styles
  customIntervalContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  customIntervalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12,
  },
  customOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customOptionItemSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  customOptionItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  customOptionItemTextSelected: {
    color: '#0369a1',
    fontWeight: '600',
  },
  addCustomOption: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    borderStyle: 'dashed',
  },
  addCustomOptionText: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
  },
  manualInputContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  manualInputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  manualInputUnit: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  manualConfirmButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  manualConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleLeft: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  noteOnlyBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  noteOnlyBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: 4,
  },
  noteOnlyBannerText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
});

export default EditAlertScreen;
