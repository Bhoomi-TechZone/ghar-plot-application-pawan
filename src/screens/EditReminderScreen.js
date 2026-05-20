/**
 * EditReminderScreen.js
 * Screen for editing existing reminders from notifications
 * User can modify reminder message and reschedule it
 * Uses FCM API for backend updates
 */
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { updateReminder } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendTokenToBackend, getFCMToken } from '../utils/fcmService';
import ReminderNotificationService from '../services/ReminderNotificationService';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

const CRM_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const EditReminderScreen = ({ route, navigation }) => {
  const { 
    reminderId, 
    clientName, 
    originalMessage, 
    enquiryId, 
    fromNotification, 
    isRepeating, 
    repeatType,
    scheduledDateTime // 🔥 Get the scheduled date from params
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(originalMessage || '');
  // 🔥 Initialize with the scheduled date from params, or current date as fallback
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (scheduledDateTime) {
      const date = new Date(scheduledDateTime);
      // Validate the date
      if (!isNaN(date.getTime())) {
        console.log('📅 Loaded scheduled date from params:', date.toISOString());
        return date;
      }
    }
    console.log('⚠️ No valid scheduled date in params, using current date');
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState(isRepeating ? (repeatType || 'daily') : 'none');

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
  }, [reminderId, fromNotification]);

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
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatDateTime = (date) => {
    return `${formatDate(date)} at ${formatTime(date)}`;
  };

  const handleSave = async () => {
    if (!message.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter a message');
      return;
    }

    const now = new Date();
    if (scheduledDate <= now) {
      CrossPlatformAlert.alert('Invalid Date', 'Please select a future date and time');
      return;
    }

    await proceedWithSave();
  };

  const proceedWithSave = async () => {
    setLoading(true);

    try {
      // Get auth token - try multiple keys
      const accessToken = await AsyncStorage.getItem('accessToken') ||
        await AsyncStorage.getItem('employeeToken') ||
        await AsyncStorage.getItem('adminToken') ||
        await AsyncStorage.getItem('employee_auth_token') ||
        await AsyncStorage.getItem('crm_auth_token') ||
        await AsyncStorage.getItem('userToken');

      if (!accessToken) {
        CrossPlatformAlert.alert('Session Expired', 'Please login again');
        return;
      }

      // 🔥 Get employeeId for FCM notification
      const employeeId = await AsyncStorage.getItem('employeeId') || await AsyncStorage.getItem('userId');
      console.log('📱 Employee ID for reminder:', employeeId);

      // 🔥 UPDATE existing reminder via backend API (not CREATE!)
      const reminderPayload = {
        title: clientName || 'Reminder',
        comment: message.trim(),
        note: message.trim(), // Backend accepts both
        reminderDateTime: scheduledDate.toISOString(),
        isRepeating: repeatFrequency !== 'none',
        repeatType: repeatFrequency !== 'none' ? repeatFrequency : 'daily',
        isActive: true,
      };

      // 🔥 Build repeatMetadata for weekly/monthly reminders
      if (repeatFrequency === 'weekly') {
        reminderPayload.repeatMetadata = { dayOfWeek: scheduledDate.getDay() };
      } else if (repeatFrequency === 'monthly') {
        reminderPayload.repeatMetadata = { dayOfMonth: scheduledDate.getDate() };
      }

      // Only add enquiryId if it's a valid MongoDB ObjectId (24 char hex)
      if (enquiryId && /^[0-9a-fA-F]{24}$/.test(enquiryId)) {
        reminderPayload.enquiryId = enquiryId;
      }

      console.log('📤 Updating reminder:', reminderPayload);
      console.log('🔑 Token:', accessToken?.substring(0, 20) + '...');
      console.log('🆔 Reminder ID:', reminderId);

      // 🔥 Check if this is OLD reminder (long format) or NEW reminder (MongoDB ID)
      const isOldReminder = reminderId.startsWith('reminder_') && reminderId.includes('_', 9);

      let response;
      if (isOldReminder) {
        console.log('⚠️ OLD REMINDER detected - Creating new backend entry');
        // OLD reminder - CREATE new backend entry
        response = await fetch(`${CRM_BASE_URL}/api/reminder/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(reminderPayload),
        });
      } else {
        console.log('✅ NEW REMINDER - Updating existing backend entry');
        // NEW reminder - UPDATE existing
        response = await fetch(`${CRM_BASE_URL}/api/reminder/update/${reminderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(reminderPayload),
        });
      }

      console.log('📥 Response status:', response.status);

      const responseText = await response.text();
      console.log('📥 Response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON parse error:', e);
        console.error('Response was:', responseText);
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
      }

      // Check if update was successful
      if (!response.ok) {
        console.error('❌ API call failed:', data);
        throw new Error(data.message || `API call failed with status ${response.status}: ${responseText.substring(0, 100)}`);
      }

      if (response.ok && data.success) {
        console.log('✅ Reminder saved successfully in backend');

        // For old reminders, get the NEW backend ID from CREATE response
        const updatedReminderId = isOldReminder && data.data && data.data._id
          ? data.data._id
          : reminderId;

        console.log('🆔 Using reminder ID for notifications:', updatedReminderId);

        // 🔥 STEP 2: Schedule FCM Notification via Backend (PRIMARY)
        try {
          console.log('🔔 Scheduling FCM notification via backend...');
          const fcmToken = await getFCMToken();

          console.log('🔍 Debug - FCM Token:', fcmToken ? 'Available ✅' : 'Missing ❌');
          console.log('🔍 Debug - Auth Token:', accessToken ? 'Available ✅' : 'Missing ❌');

          if (fcmToken && accessToken) {
            const requestBody = {
              reminderId: updatedReminderId,
              scheduledTime: scheduledDate.toISOString(),
              title: clientName,
              message: message.trim(),
              fcmToken: fcmToken,
              data: {
                type: 'reminder',
                reminderId: updatedReminderId,
                clientName: clientName,
                enquiryId: enquiryId,
                employeeId: employeeId,
                notificationType: 'reminder',
              }
            };

            console.log('📤 Sending FCM request:', JSON.stringify(requestBody, null, 2));

            const fcmResponse = await fetch(`${CRM_BASE_URL}/api/reminder/schedule-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(requestBody),
            });

            console.log('📥 FCM Response Status:', fcmResponse.status);

            const responseText = await fcmResponse.text();
            console.log('📥 FCM Response Body:', responseText);

            if (fcmResponse.ok) {
              try {
                const fcmResult = JSON.parse(responseText);
                if (fcmResult.success) {
                  console.log('✅ FCM notification scheduled successfully!');
                } else {
                  console.warn('⚠️ FCM scheduling failed:', fcmResult.message);
                }
              } catch (parseError) {
                console.error('❌ Failed to parse FCM response:', parseError);
              }
            } else {
              console.error('❌ FCM API returned error status:', fcmResponse.status);
              console.error('❌ Error response:', responseText);
            }
          } else {
            console.warn('⚠️ Cannot schedule FCM - Missing token(s)');
          }
        } catch (fcmError) {
          console.error('❌ FCM scheduling error:', fcmError);
          // Don't fail - continue to local backup
        }

        // 🔥 STEP 3: Schedule Local Notification as BACKUP
        console.log('📱 Scheduling local backup notification...');
        try {
          const localNotificationResult = await ReminderNotificationService.scheduleReminder({
            id: updatedReminderId,
            clientName: clientName,
            message: message.trim(),
            scheduledDate: scheduledDate,
            enquiryId: enquiryId,
            enquiry: {
              _id: enquiryId,
              clientName: clientName,
              phone: route.params?.phone || '',
              email: route.params?.email || '',
            },
          });

          if (localNotificationResult.success) {
            console.log('✅ Local backup notification scheduled successfully!');
          } else {
            console.warn('⚠️ Local notification scheduling failed:', localNotificationResult.error);
          }
        } catch (localError) {
          console.error('❌ Local notification error:', localError);
        }

        // Save to AsyncStorage for Enquiry Details
        try {
          const localRemindersJson = await AsyncStorage.getItem('localReminders');
          const localReminders = localRemindersJson ? JSON.parse(localRemindersJson) : [];

          const updatedLocalReminder = {
            id: updatedReminderId,
            clientName: clientName,
            message: message.trim(),
            scheduledDate: scheduledDate.toISOString(),
            enquiryId: enquiryId,
            createdAt: new Date().toISOString(),
          };

          localReminders.push(updatedLocalReminder);
          await AsyncStorage.setItem('localReminders', JSON.stringify(localReminders));
          console.log('✅ Reminder saved to local storage for Enquiry Details');

          // Also save to app_reminders for popup
          const appRemindersJson = await AsyncStorage.getItem('app_reminders');
          const appReminders = appRemindersJson ? JSON.parse(appRemindersJson) : [];
          appReminders.push(updatedLocalReminder);
          await AsyncStorage.setItem('app_reminders', JSON.stringify(appReminders));
          console.log('✅ Reminder saved to app_reminders for popup');
        } catch (localError) {
          console.warn('⚠️ Could not save to local storage:', localError);
        }

        CrossPlatformAlert.alert(
          '✅ Success',
          `Reminder updated successfully!\n\n📅 ${formatDateTime(scheduledDate)}\n\n🔔 You'll receive both FCM and local notifications.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        console.error('API Error:', data);
        throw new Error(data.message || `Server error: ${response.status} - ${responseText}`);
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
        `Failed to update reminder.\n\nDetails: ${error.message}\n\nReminder ID: ${reminderId}\n\nPlease check if this is a valid reminder.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    CrossPlatformAlert.alert(
      'Cancel Edit',
      'Are you sure you want to discard changes?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => navigation.goBack() },
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

        {/* Client Name (Read-only) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Client Name</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{clientName}</Text>
          </View>
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
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

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
            onPress={() => {
              CrossPlatformAlert.alert(
                'Repeat Frequency',
                'Choose how often this reminder should repeat',
                [
                  { text: '🚫 Does not repeat', onPress: () => setRepeatFrequency('none') },
                  { text: '📅 Daily', onPress: () => setRepeatFrequency('daily') },
                  { text: '📆 Weekly', onPress: () => setRepeatFrequency('weekly') },
                  { text: '🗓️ Monthly', onPress: () => setRepeatFrequency('monthly') },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            <Text style={[styles.inputText, repeatFrequency !== 'none' && styles.repeatActiveText]}>
              {repeatFrequency === 'none' ? '🚫 Does not repeat' :
                repeatFrequency === 'daily' ? '📅 Repeats Daily' :
                  repeatFrequency === 'weekly' ? '📆 Repeats Weekly' :
                    repeatFrequency === 'monthly' ? '🗓️ Repeats Monthly' : '🚫 Does not repeat'}
            </Text>
            <Text style={styles.repeatArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Scheduled For Display */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Reminder will be scheduled for:</Text>
          <Text style={styles.infoValue}>{formatDateTime(scheduledDate)}</Text>
        </View>

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
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save & Reschedule</Text>
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
    minHeight: 120,
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
});

export default EditReminderScreen;
