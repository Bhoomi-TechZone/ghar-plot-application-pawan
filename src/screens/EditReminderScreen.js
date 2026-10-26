/* eslint-disable react-native/no-inline-styles */
/**
 * EditReminderScreen.js
 * Screen for editing existing reminders from notifications
 * User can modify reminder message and reschedule it
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
import { updateReminder, BASE_URL } from '../services/api';
import { updateAlert, deleteAlert } from '../crm/services/crmAlertApi'; // 🔥 Import alerts API
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendTokenToBackend, getFCMToken } from '../utils/fcmService';
//import ReminderNotificationService from '../services/ReminderNotificationService';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

//const CRM_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const EditReminderScreen = ({ route, navigation }) => {
  const {
    reminderId,
    clientName,
    originalMessage,
    //enquiryId, 
    fromNotification,
    isRepeating,
    repeatType,
    repeatFrequency: origRepeatFreq,
    repeatDaily,
    repeatMetadata: origRepeatMetadata,
    customIntervalMinutes: origCustomMins,
    scheduledDateTime, // 🔥 Get the scheduled date from params
    placeReminder: initialPlaceReminderParam,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [placeReminder, setPlaceReminder] = useState(
    initialPlaceReminderParam !== undefined
      ? (initialPlaceReminderParam === true || initialPlaceReminderParam === 'true')
      : true
  );
  const [title, setTitle] = useState(clientName || '');
  const [message, setMessage] = useState(originalMessage || '');
  // 🔥 KEY FIX: Initialize scheduledDate to the NEXT scheduled date & time.
  // For Daily, Weekly, Monthly, Yearly, and Custom (minute/hourly) repeating reminders:
  // always display the NEXT scheduled date & time (matching My Reminders card),
  // NEVER the initial creation time (e.g. if created at 3:20 for 4:20 daily, show 4:20).
  const [scheduledDate, setScheduledDate] = useState(() => {
    const rawFreq = String(
      origRepeatFreq ||
      repeatType ||
      route.params?.repeatFrequency ||
      route.params?.repeatType ||
      (repeatDaily === true || repeatDaily === 'true' ? 'daily' : '') ||
      ''
    ).toLowerCase();

    const customMins = parseInt(
      origCustomMins ||
      origRepeatMetadata?.customIntervalMinutes ||
      route.params?.customIntervalMinutes ||
      route.params?.customRepeatMinutes ||
      route.params?.repeatInterval ||
      0,
      10
    );

    const isCustom = rawFreq === 'custom' ||
      rawFreq === 'hourly' ||
      rawFreq === '1 min' ||
      rawFreq === '1_min' ||
      customMins > 0;

    const isDaily = rawFreq === 'daily' || repeatDaily === true || repeatDaily === 'true';
    const isWeekly = rawFreq === 'weekly';
    const isMonthly = rawFreq === 'monthly';
    const isYearly = rawFreq === 'yearly';

    const effectiveMins = (rawFreq === '1 min' || rawFreq === '1_min')
      ? 1
      : (rawFreq === 'hourly' && (!customMins || customMins === 0) ? 60 : (customMins || 1));

    // Priority 1: Use nextScheduledAt / scheduledDateTime from route params (computed by backend)
    const targetIso = route.params?.nextScheduledAt || scheduledDateTime;
    const nowMs = Date.now();

    if (targetIso) {
      let sDate = null;
      // If "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm" without timezone offset/Z, parse explicitly as IST
      if (typeof targetIso === 'string' && !targetIso.includes('Z') && !targetIso.includes('+')) {
        try {
          const cleanStr = targetIso.replace('T', ' ');
          const [datePart, timePart] = cleanStr.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes] = timePart.split(':').map(Number);
          const istOffsetMs = 5.5 * 60 * 60 * 1000;
          const baseMs = Date.UTC(year, month - 1, day, hours, minutes, 0) - istOffsetMs;
          sDate = new Date(baseMs);
        } catch (_) { }
      }
      if (!sDate || isNaN(sDate.getTime())) {
        sDate = new Date(targetIso);
      }

      if (!isNaN(sDate.getTime())) {
        let nextMs = sDate.getTime();

        // Advance repeating reminders to the true next scheduled occurrence if past
        if (isCustom && nextMs <= nowMs) {
          const intervalMs = effectiveMins * 60 * 1000;
          while (nextMs <= nowMs) {
            nextMs += intervalMs;
          }
        } else if (isDaily && nextMs <= nowMs) {
          while (nextMs <= nowMs) {
            nextMs += 24 * 60 * 60 * 1000;
          }
        } else if (isWeekly && nextMs <= nowMs) {
          while (nextMs <= nowMs) {
            nextMs += 7 * 24 * 60 * 60 * 1000;
          }
        } else if (isMonthly && nextMs <= nowMs) {
          let mDate = new Date(nextMs);
          while (mDate.getTime() <= nowMs) {
            mDate.setMonth(mDate.getMonth() + 1);
          }
          nextMs = mDate.getTime();
        } else if (isYearly && nextMs <= nowMs) {
          let yDate = new Date(nextMs);
          while (yDate.getTime() <= nowMs) {
            yDate.setFullYear(yDate.getFullYear() + 1);
          }
          nextMs = yDate.getTime();
        }

        const result = new Date(nextMs);
        console.log('📅 EditReminder: Initialized next scheduled date & time from targetIso:', result.toLocaleString());
        return result;
      }
    }

    // Priority 2: Fallback - calculate from scheduled time & date
    // Use scheduled time (e.g. "16:20"), NOT creation time (e.g. "15:20")
    const timeStr = route.params?.time || route.params?.originalTime;
    const dateStr = route.params?.date || route.params?.originalDate || scheduledDateTime;

    if (timeStr && dateStr) {
      try {
        const datePart = String(dateStr).split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = String(timeStr).split(':').map(Number);
        if (year && month && day && !isNaN(hours) && !isNaN(minutes)) {
          const istOffsetMs = 5.5 * 60 * 60 * 1000;
          const baseMs = Date.UTC(year, month - 1, day, hours, minutes, 0) - istOffsetMs;
          let nextMs = baseMs;

          if (isCustom && nextMs <= nowMs) {
            const intervalMs = effectiveMins * 60 * 1000;
            while (nextMs <= nowMs) {
              nextMs += intervalMs;
            }
          } else if (isDaily && nextMs <= nowMs) {
            while (nextMs <= nowMs) {
              nextMs += 24 * 60 * 60 * 1000;
            }
          } else if (isWeekly && nextMs <= nowMs) {
            while (nextMs <= nowMs) {
              nextMs += 7 * 24 * 60 * 60 * 1000;
            }
          } else if (isMonthly && nextMs <= nowMs) {
            let mDate = new Date(nextMs);
            while (mDate.getTime() <= nowMs) {
              mDate.setMonth(mDate.getMonth() + 1);
            }
            nextMs = mDate.getTime();
          } else if (isYearly && nextMs <= nowMs) {
            let yDate = new Date(nextMs);
            while (yDate.getTime() <= nowMs) {
              yDate.setFullYear(yDate.getFullYear() + 1);
            }
            nextMs = yDate.getTime();
          }

          const result = new Date(nextMs);
          console.log('📅 EditReminder: Initialized next scheduled date & time from baseMs calculation:', result.toLocaleString());
          return result;
        }
      } catch (_) { }
    }

    console.log('⚠️ EditReminder: No valid scheduled date in params, using current date');
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState(
    origRepeatFreq ||
    (repeatDaily === true || repeatDaily === 'true' ? 'daily' : (isRepeating ? (repeatType || 'daily') : 'none'))
  );
  const [customIntervalMinutes, setCustomIntervalMinutes] = useState(
    origCustomMins || origRepeatMetadata?.customIntervalMinutes || route.params?.customIntervalMinutes || ''
  );
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showCustomManualInput, setShowCustomManualInput] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

  // Track if changes are saved or being discarded to avoid redundant prompts
  const isSavedRef = useRef(false);
  const initialValuesRef = useRef({
    title: clientName || '',
    message: originalMessage || '',
    repeatFrequency: origRepeatFreq || (repeatDaily === true || repeatDaily === 'true' ? 'daily' : (isRepeating ? (repeatType || 'daily') : 'none')),
    customIntervalMinutes: origCustomMins || origRepeatMetadata?.customIntervalMinutes || route.params?.customIntervalMinutes || '',
  });

  const hasUnsavedChanges = () => {
    if (isSavedRef.current) return false;
    const init = initialValuesRef.current;
    const currentTitle = (title || '').trim();
    const currentMessage = (message || '').trim();
    const initTitle = (init.title || '').trim();
    const initMessage = (init.message || '').trim();

    return currentTitle !== initTitle ||
      currentMessage !== initMessage ||
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
          { text: 'Keep Editing', style: 'cancel', onPress: () => { } },
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
  }, [navigation, title, message, repeatFrequency, customIntervalMinutes]);

  useEffect(() => {
    if (!reminderId) {
      CrossPlatformAlert.alert('Error', 'Invalid reminder ID');
      navigation.goBack();
    }

    // 🔥 Log notification click for debugging
    if (fromNotification) {
      console.log('🔔 EditReminder opened from notification click');
      console.log('📋 Reminder ID:', reminderId);
      console.log('👤 Client Name:', clientName);
      console.log('📝 Message:', originalMessage);
    }

    // 🔥 Ensure FCM token is synced to backend for notifications
    const syncFCMToken = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId') || await AsyncStorage.getItem('employeeId');
        const token = await getFCMToken();
        if (userId && token) {
          await sendTokenToBackend(userId, token);
          console.log('✅ FCM token synced for notifications');
        }
      } catch (error) {
        console.warn('⚠️ FCM sync failed:', error);
      }
    };
    syncFCMToken();
  }, [reminderId, fromNotification, navigation, clientName, originalMessage]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Update date but keep existing time
      const newDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        scheduledDate.getHours(),
        scheduledDate.getMinutes()
      );
      setScheduledDate(newDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Update time but keep existing date
      const newDate = new Date(
        scheduledDate.getFullYear(),
        scheduledDate.getMonth(),
        scheduledDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
      setScheduledDate(newDate);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';

    const d = new Date(date);

    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    if (!date) return '';

    const d = new Date(date);

    if (isNaN(d.getTime())) return '';

    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '';

    return `${formatDate(date)} at ${formatTime(date)}`;
  };

  const [customUnit, setCustomUnit] = useState('days');

  const getRepeatLabel = () => {
    if (repeatFrequency === 'custom') {
      const mins = Number(customIntervalMinutes);
      if (mins % 1440 === 0 && mins >= 1440) {
        const days = mins / 1440;
        return days === 1 ? 'Every 1 day (Daily)' : `Every ${days} days`;
      }
      if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return remainingMins > 0 ? `Every ${hours}h ${remainingMins}m` : `Every ${hours} hour${hours > 1 ? 's' : ''}`;
      }
      return mins > 0 ? `Every ${mins} minute${mins > 1 ? 's' : ''}` : 'Custom';
    }

    const labels = {
      none: 'Does not repeat',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return labels[repeatFrequency] || 'Does not repeat';
  };

  const handleRepeatSelect = (frequency) => {
    setRepeatFrequency(frequency);
    if (frequency === 'custom') {
      setShowCustomInput(true);
    } else {
      setCustomIntervalMinutes('');
      setShowCustomInput(false);
      setShowCustomManualInput(false);
      setShowRepeatModal(false);
    }
  };

  const customIntervalOptions = [
    { label: '10 Minutes', value: 10 },
    { label: '30 Minutes', value: 30 },
    { label: '1 Hour', value: 60 },
    { label: '2 Hours', value: 120 },
    { label: '3 Hours', value: 180 },
    { label: '4 Hours', value: 240 },
    { label: '6 Hours', value: 360 },
    { label: '12 Hours', value: 720 },
    { label: '1 Day (Daily)', value: 1440 },
    { label: '2 Days', value: 2880 },
    { label: '3 Days', value: 4320 },
    { label: '5 Days', value: 7200 },
    { label: '7 Days (Weekly)', value: 10080 },
  ];

  const handleCustomIntervalSelect = (minutes) => {
    setCustomIntervalMinutes(minutes);
    setShowCustomInput(false);
    setShowCustomManualInput(false);
    setShowRepeatModal(false);
  };

  const handleManualMinutesChange = (value) => {
    setManualMinutes(value.replace(/[^0-9]/g, ''));
  };

  const confirmManualMinutes = () => {
    const val = parseInt(manualMinutes, 10) || 1;
    const computedMins = customUnit === 'days' ? val * 1440 : val;
    handleCustomIntervalSelect(computedMins > 0 ? computedMins : 60);
  };

  const handleTogglePlaceReminder = async (newVal) => {
    setPlaceReminder(newVal);
    // Option A: Immediate auto-save on toggle for instant persistence
    try {
      const cleanId = String(reminderId).replace(/^(alert_|reminder_)/, '');
      const autoSavePayload = {
        title: title.trim() || 'Reminder',
        reason: message.trim(),
        comment: message.trim(),
        note: message.trim(),
        isActive: newVal,
        placeReminder: newVal,
      };
      let saved = false;
      try {
        const resAlert = await updateAlert(cleanId, autoSavePayload);
        if (resAlert && resAlert.success !== false) saved = true;
      } catch (_) { }
      if (!saved) {
        try {
          await updateReminder(cleanId, autoSavePayload);
          saved = true;
        } catch (_) { }
      }
      console.log(`✅ [Option A] Auto-saved reminder placeReminder = ${newVal}`);
    } catch (autoErr) {
      console.warn('⚠️ Auto-save error on toggle:', autoErr?.message);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter a title');
      return;
    }
    if (!message.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter a message');
      return;
    }

    if (placeReminder) {
      const now = new Date();
      const isRepeating = repeatFrequency && repeatFrequency !== 'none';
      if (isRepeating && scheduledDate <= now) {
        const nowMs = now.getTime();
        let nextMs = scheduledDate.getTime();
        if (repeatFrequency === 'custom') {
          const intervalMs = (Number(customIntervalMinutes) || 1) * 60 * 1000;
          while (nextMs <= nowMs) {
            nextMs += intervalMs;
          }
        } else if (repeatFrequency === 'daily') {
          while (nextMs <= nowMs) {
            nextMs += 24 * 60 * 60 * 1000;
          }
        } else if (repeatFrequency === 'weekly') {
          while (nextMs <= nowMs) {
            nextMs += 7 * 24 * 60 * 60 * 1000;
          }
        } else if (repeatFrequency === 'monthly') {
          let mDate = new Date(nextMs);
          while (mDate.getTime() <= nowMs) {
            mDate.setMonth(mDate.getMonth() + 1);
          }
          nextMs = mDate.getTime();
        } else if (repeatFrequency === 'yearly') {
          let yDate = new Date(nextMs);
          while (yDate.getTime() <= nowMs) {
            yDate.setFullYear(yDate.getFullYear() + 1);
          }
          nextMs = yDate.getTime();
        }
        scheduledDate.setTime(nextMs);
      } else if (!isRepeating && scheduledDate <= now) {
        CrossPlatformAlert.alert('Invalid Date', 'Please select a future date and time');
        return;
      }
    }

    await proceedWithSave();
  };

  const proceedWithSave = async () => {
    setLoading(true);

    try {
      // Format date and time for API using local time to prevent timezone shift issues
      const year = scheduledDate.getFullYear();
      const month = (scheduledDate.getMonth() + 1).toString().padStart(2, '0');
      const day = scheduledDate.getDate().toString().padStart(2, '0');
      const hours = scheduledDate.getHours().toString().padStart(2, '0');
      const minutes = scheduledDate.getMinutes().toString().padStart(2, '0');

      // 🔥 UPDATE existing reminder via alerts / reminder API
      const isCustom = repeatFrequency === 'custom';
      const reminderPayload = {
        title: title.trim() || 'Reminder',
        reason: message.trim(),
        date: `${year}-${month}-${day}`, // Local date Format: YYYY-MM-DD
        time: `${hours}:${minutes}`, // Local time Format: HH:mm
        repeatFrequency: repeatFrequency !== 'none' ? repeatFrequency : 'none',
        repeatDaily: repeatFrequency === 'daily',
        customRepeatMinutes: isCustom ? (customIntervalMinutes || '') : '',
        repeatMetadata: null, // Reset previous metadata so daily does not carry over stale customIntervalMinutes
        isActive: placeReminder,
        placeReminder: placeReminder,
      };

      // 🔥 Build repeatMetadata for weekly/monthly/yearly/custom reminders
      if (repeatFrequency === 'weekly') {
        reminderPayload.repeatMetadata = { dayOfWeek: scheduledDate.getDay() };
      } else if (repeatFrequency === 'monthly') {
        reminderPayload.repeatMetadata = { dayOfMonth: scheduledDate.getDate() };
      } else if (repeatFrequency === 'yearly') {
        reminderPayload.repeatMetadata = {
          month: scheduledDate.getMonth() + 1,
          dayOfMonth: scheduledDate.getDate(),
        };
      } else if (isCustom && customIntervalMinutes) {
        reminderPayload.repeatMetadata = { customIntervalMinutes: Number(customIntervalMinutes) };
      }

      console.log('📤 Updating reminder via alerts / reminder API:', reminderPayload);
      console.log('🆔 Reminder ID:', reminderId);

      const cleanId = String(reminderId).replace(/^(alert_|reminder_)/, '');
      let response = null;
      let updateError = null;

      // Try updateAlert first
      try {
        response = await updateAlert(cleanId, reminderPayload);
      } catch (err) {
        console.log('⚠️ updateAlert failed, trying updateReminder:', err.message);
        updateError = err;
      }

      // If updateAlert failed or returned 404/false, fallback to updateReminder
      if (!response || response.success === false) {
        try {
          const reminderData = {
            title: reminderPayload.title,
            comment: reminderPayload.reason,
            note: reminderPayload.reason,
            reminderDateTime: scheduledDate.toISOString(),
            isRepeating: repeatFrequency !== 'none',
            repeatType: repeatFrequency,
            customRepeatMinutes: isCustom ? Number(customIntervalMinutes) || 0 : 0,
            isActive: placeReminder,
            placeReminder: placeReminder,
          };
          response = await updateReminder(cleanId, reminderData);
        } catch (remErr) {
          console.error('❌ updateReminder also failed:', remErr.message);
          throw updateError || remErr;
        }
      }

      console.log('📥 API Response:', JSON.stringify(response, null, 2));

      // Check if update was successful
      if (response && response.success !== false) {
        if (!placeReminder) {
          console.log('ℹ️ Reminder updated in note mode (placeReminder: false) - skipping FCM reschedule');
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

        console.log('✅ Reminder updated successfully via alerts API');

        // 🔥 Schedule the notification on backend to ensure correct timezone and firing
        try {
          const fcmToken = await getFCMToken();
          const scheduledDateTimeISO = scheduledDate.toISOString();

          const authToken = await AsyncStorage.getItem('adminToken') ||
            await AsyncStorage.getItem('crm_token') ||
            await AsyncStorage.getItem('admin_token') ||
            await AsyncStorage.getItem('authToken') ||
            await AsyncStorage.getItem('userToken');

          if (authToken) {
            const fcmResponse = await fetch(`${BASE_URL}/api/alerts/schedule-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                alertId: reminderId,
                title: reminderPayload.title,
                reason: reminderPayload.reason,
                date: reminderPayload.date,
                time: reminderPayload.time,
                scheduledDateTime: scheduledDateTimeISO,
                repeatFrequency: reminderPayload.repeatFrequency,
                repeatDaily: reminderPayload.repeatDaily, // Strictly true ONLY for daily
                repeatMetadata: reminderPayload.repeatMetadata,
                customRepeatMinutes: customIntervalMinutes,
                type: 'admin_reminder',
                notificationType: 'admin_reminder',
                fcmToken: fcmToken,
              }),
            });
            const contentType = fcmResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              await fcmResponse.json();
            }
          }
        } catch (fcmErr) {
          console.warn('Failed to schedule notification:', fcmErr);
        }

        CrossPlatformAlert.alert(
          '✅ Success',
          `Reminder updated successfully!\n\n📅 ${formatDateTime(scheduledDate)}`,
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
        console.error('❌ API call failed:', response);
        throw new Error(response?.message || 'Failed to update reminder');
      }
    } catch (error) {
      console.error('❌ Error saving reminder:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        reminderId: reminderId,
        clientName: clientName,
      });
      CrossPlatformAlert.alert(
        'Error',
        `Failed to update reminder.\n\nDetails: ${error.message}\n\nReminder ID: ${reminderId}`
      );
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
          { text: 'Keep Editing', style: 'cancel', onPress: () => { } },
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
      'Delete Reminder',
      'Are you sure you want to delete this reminder? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // 🔥 Use alerts API for delete
              const result = await deleteAlert(reminderId);

              if (result && result.success) {
                CrossPlatformAlert.alert(
                  'Success',
                  'Reminder deleted successfully',
                  [{
                    text: 'OK',
                    onPress: () => {
                      isSavedRef.current = true;
                      navigation.goBack();
                    }
                  }]
                );
              } else {
                throw new Error(result?.message || 'Failed to delete reminder');
              }
            } catch (error) {
              console.error('❌ Delete error:', error);
              CrossPlatformAlert.alert('Error', error.message || 'Failed to delete reminder');
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
        <Text style={styles.title}>Edit Reminder</Text>
        <Text style={styles.subtitle}>Update reminder details and reschedule</Text>

        {/* 🔥 Show message when notification is clicked */}
        {fromNotification && (
          <View style={[styles.infoBox, { backgroundColor: '#D4EDDA', borderColor: '#28A745', borderWidth: 2 }]}>
            <Text style={[styles.infoLabel, { color: '#155724' }]}>✅ Reminder Notification Acknowledged</Text>
            <Text style={{ color: '#155724', marginTop: 5 }}>You can now continue with your tasks</Text>
          </View>
        )}

        {/* Title */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.inputField}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter title"
            placeholderTextColor="#999"
          />
        </View>

        {/* Message */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Reminder Message *</Text>
          <TextInput
            style={styles.textArea}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter reminder message (e.g., Shivam is coming in 10 min)"
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
                style={styles.inputField}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.inputText}>
                  {formatDate(scheduledDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Time Picker */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Time *</Text>
              <TouchableOpacity
                style={styles.inputField}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.inputText}>
                  {formatTime(scheduledDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Repeat Frequency Selector */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Repeat Frequency</Text>
              <TouchableOpacity
                style={[styles.inputField, styles.repeatSelector]}
                onPress={() => setShowRepeatModal(true)}
              >
                <Text style={[styles.inputText, repeatFrequency !== 'none' && styles.repeatActiveText]}>
                  {getRepeatLabel()}
                </Text>
                <Text style={styles.repeatArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Scheduled For Display */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Reminder will be scheduled for:</Text>
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
              This reminder is saved as a note/comment. Date & time alerts, push notifications, and popup dialogs are disabled.
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
            <Text style={styles.deleteButtonText}>Delete Reminder</Text>
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

                {showCustomInput && (
                  <View style={styles.customIntervalContainer}>
                    <Text style={styles.customIntervalLabel}>Select interval:</Text>
                    {customIntervalOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.customOptionItem,
                          customIntervalMinutes === option.value && styles.customOptionItemSelected,
                        ]}
                        onPress={() => handleCustomIntervalSelect(option.value)}
                      >
                        <Text
                          style={[
                            styles.customOptionItemText,
                            customIntervalMinutes === option.value && styles.customOptionItemTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[styles.customOptionItem, styles.addCustomOption]}
                      onPress={() => setShowCustomManualInput(!showCustomManualInput)}
                    >
                      <Text style={styles.addCustomOptionText}>+ Add Custom</Text>
                    </TouchableOpacity>

                    {showCustomManualInput && (
                      <View style={styles.manualInputContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={styles.manualInputLabel}>Enter interval:</Text>
                          <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: '#e2e8f0' }}>
                            <TouchableOpacity
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor: customUnit === 'days' ? '#4F46E5' : 'transparent',
                              }}
                              onPress={() => setCustomUnit('days')}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: customUnit === 'days' ? '#fff' : '#64748b' }}>Days</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor: customUnit === 'mins' ? '#4F46E5' : 'transparent',
                              }}
                              onPress={() => setCustomUnit('mins')}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: customUnit === 'mins' ? '#fff' : '#64748b' }}>Mins</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.manualInputRow}>
                          <TextInput
                            style={styles.manualInput}
                            keyboardType="numeric"
                            value={manualMinutes}
                            onChangeText={handleManualMinutesChange}
                            placeholder={customUnit === 'days' ? "e.g. 2" : "e.g. 45"}
                            placeholderTextColor="#9ca3af"
                          />
                          <Text style={styles.manualInputUnit}>{customUnit === 'days' ? 'day(s)' : 'min'}</Text>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  readOnlyField: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
    minHeight: 360,
  },
  inputField: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  repeatSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: '#ccc',
  },
  repeatActiveText: {
    color: '#FF9800',
    fontWeight: '600',
  },
  repeatArrow: {
    fontSize: 12,
    color: '#999',
  },
  infoBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  infoLabel: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#FFB74D',
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
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

export default EditReminderScreen;