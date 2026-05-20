/**
 * Reminder Modal Component
 * Simple form for creating reminders with native notifications
 * Updated to use ReminderNotificationService for background notifications
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createReminder, createReminderFromLead, sendScheduledReminderNotification } from '../../../services/crmEnquiryApi';
import { createReminderDateTime, extractClientInfo, convertTo24Hour } from '../../../services/reminderService';
import ReminderNotificationService from '../../../../services/ReminderNotificationService';
import AlertNotificationService from '../../../../services/AlertNotificationService';
import { getFCMToken } from '../../../../utils/fcmService';
import { BASE_URL } from '../../../../services/api';
import CrossPlatformAlert from '../../../../utils/crossPlatformAlert';

const ReminderModal = ({ visible, onClose, enquiry, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    date: '',
    hour: '1',
    minute: '00',
    period: 'AM',
    note: '',
    repeatType: 'none',
    customIntervalMinutes: '',
  });

  // Repeat Options (Synced with CreateAlertScreen.js)
  const REPEAT_OPTIONS = [
    { label: 'Does not repeat', value: 'none', icon: '❌' },
    { label: 'Daily', value: 'daily', icon: '📅' },
    { label: 'Weekly', value: 'weekly', icon: '📆' },
    { label: 'Monthly', value: 'monthly', icon: '🗓️' },
    { label: 'Yearly', value: 'yearly', icon: '🌐' },
    { label: 'Custom', value: 'custom', icon: '⚙️' },
  ];

  // Populate form when enquiry changes
  React.useEffect(() => {
    if (enquiry) {
      console.log('📝 Populating reminder form for:', enquiry.clientName || enquiry.fullName);
      const clientInfo = extractClientInfo(enquiry);
      
      // Format today's date as DD-MM-YYYY for the input field
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const formattedDate = `${dd}-${mm}-${yyyy}`;
 
      setFormData({
        name: clientInfo.name || '',
        email: clientInfo.email || '',
        phone: clientInfo.phone || '',
        location: clientInfo.location || '',
        date: formattedDate,
        hour: '1',
        minute: '00',
        period: 'AM',
        note: '',
        repeatType: 'none',
        customIntervalMinutes: '',
      });
      setShowCustomInput(false);
    }
  }, [enquiry]);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Show custom input when custom repeat is selected
    if (field === 'repeatType') {
      setShowCustomInput(value === 'custom');
    }
  };

  // Get custom interval label
  const getCustomLabel = () => {
    const mins = formData.customIntervalMinutes;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `Every ${hours}h ${remainingMins}m` : `Every ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `Every ${mins} minute${mins > 1 ? 's' : ''}`;
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter name');
      return false;
    }

    if (!formData.phone.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter phone number');
      return false;
    }

    if (!formData.date) {
      CrossPlatformAlert.alert('Validation Error', 'Please select a date');
      return false;
    }

    // Validate date format
    const selectedDate = new Date(formData.date);
    if (isNaN(selectedDate.getTime())) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter a valid date');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !enquiry) return;

    setLoading(true);

    try {

      // Create reminder date and time
      const reminderDateTime = createReminderDateTime(
        formData.date,
        formData.hour,
        formData.minute,
        formData.period
      );

      // Validate that the reminder is set for future
      const reminderDate = new Date(reminderDateTime);
      const now = new Date();

      if (reminderDate <= now) {
        CrossPlatformAlert.alert('Invalid Date', 'Please select a future date and time for the reminder');
        return;
      }

      // Normalize custom interval if empty
      const customMins = formData.repeatType === 'custom' ? (parseInt(formData.customIntervalMinutes) || 60) : null;

      // Prepare data for notification service
      const reminderData = {
        id: `reminder_${enquiry._id}_${Date.now()}`,
        clientName: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.note || `Follow up with ${formData.name} regarding property inquiry`,
        scheduledDate: reminderDate.toISOString(),
        enquiryId: enquiry._id,
        enquiry: enquiry,
        repeatType: formData.repeatType,
        customIntervalMinutes: customMins,
        // Enhanced navigation configuration for notification click
        targetScreen: 'EnquiryDetails', // Navigate to specific enquiry details
        navigationType: 'nested',
        navigationData: {
          enquiryId: enquiry._id,
          clientName: formData.name,
          clientPhone: formData.phone,
          clientEmail: formData.email,
          reminderType: 'follow_up',
          enquiry: enquiry,
          openReminderTab: true, // Open reminder tab in details
        },
      };

      // �️ FIRST: Save reminder to database
      console.log('💾 Saving reminder to database...');
      const dbResult = await createReminder({
        title: `Follow up with ${formData.name}`,
        clientName: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        reminderDateTime: reminderDate.toISOString(),
        note: formData.note || `Follow up with ${formData.name} regarding property inquiry`,
        isRepeating: formData.repeatType !== 'none',
        enquiryId: enquiry._id,
        repeatType: formData.repeatType,
        customIntervalMinutes: customMins,
      });

      if (!dbResult.success) {
        console.warn('⚠️ Database save failed, but continuing with notifications');
      } else {
        console.log('✅ Reminder saved to database successfully');
      }

      // 🔑 Determine admin status accurately
      const adminToken = await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('admin_token');
      const isAdmin = !!adminToken;

      let result;

      // ⚠️ CRITICAL: Match Admin Alert Flow (CreateAlertScreen.js)
      // We do 3 things: 1. Save to DB (done above), 2. Schedule FCM (Backend), 3. Schedule Local backup

      // notification Id for local scheduling
      const notificationId = `enquiry_reminder_${enquiry._id}_${Date.now()}`;
      const finalNotificationType = isAdmin ? 'admin_reminder' : 'reminder';
      
      // Get 24-hour components
      const timeComponents = convertTo24Hour(formData.hour, formData.minute, formData.period);
      // 🔥 Format as HH:MM string for notification services
      const timeStr24 = `${String(timeComponents.hour).padStart(2, '0')}:${String(timeComponents.minute).padStart(2, '0')}`;

      // 🔥 Format date as YYYY-MM-DD for notification services
      const [dd, mm, yyyy] = formData.date.split('-');
      const dateForService = `${yyyy}-${mm}-${dd}`;
      const navData = JSON.stringify({
        scrollToEnquiry: enquiry._id,
        showDetails: true,
        fromNotification: true,
        isReminderNotification: true,
        highlightEnquiry: enquiry._id,
        clientName: formData.name
      });

      if (isAdmin) {
        console.log('👤 Admin user detected — scheduling both FCM and local backup');
        
        // 1. Calculate metadata for repeating alerts
        let dateStr = dateForService;
        let repeatMetadata = {};
        
        if (formData.repeatType === 'weekly') {
          repeatMetadata.dayOfWeek = reminderDate.getDay();
        } else if (formData.repeatType === 'monthly') {
          repeatMetadata.dayOfMonth = reminderDate.getDate();
        } else if (formData.repeatType === 'yearly') {
          repeatMetadata.month = reminderDate.getMonth() + 1;
          repeatMetadata.dayOfMonth = reminderDate.getDate();
        }

        // 2. Schedule FCM via Backend (supports kill mode)
        try {
          const fcmToken = await getFCMToken();
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          };

          const fcmPayload = {
            title: `Reminder: ${formData.name}`,
            reason: formData.note || `Follow up with ${formData.name}`,
            date: dateForService,
            time: timeStr24,
            scheduledDateTime: reminderDate.toISOString(),
            repeatFrequency: formData.repeatType,
            repeatMetadata: repeatMetadata,
            repeatDaily: formData.repeatType === 'daily',
            customRepeatMinutes: customMins,
            type: 'admin_reminder',
            notificationType: 'admin_reminder',
            fcmToken: fcmToken,
            navigationData: navData
          };

          console.log('📤 Sending FCM payload to backend:', JSON.stringify(fcmPayload, null, 2));
          
          const fcmResponse = await fetch(`${BASE_URL}/api/alerts/schedule-notification`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(fcmPayload),
          });

          if (fcmResponse.ok) {
            const fcmJson = await fcmResponse.json();
            console.log('✅ Backend FCM schedule response:', fcmJson);
          } else {
            const errorText = await fcmResponse.text();
            console.warn('⚠️ Backend FCM scheduling failed. Status:', fcmResponse.status, 'Body:', errorText);
          }
        } catch (fcmError) {
          console.error('❌ FCM Request error exception:', fcmError);
        }

        // 🚫 LOCAL NOTIFICATION DISABLED — Only FCM push from backend should show
        // // 3. Schedule Local Backup via AlertNotificationService (same as CreateAlertScreen)
        // const localPayload = {
        //   id: enquiry._id,
        //   date: dateForService,
        //   time: timeStr24,
        //   title: `Reminder: ${formData.name}`,
        //   reason: formData.note || `Follow up with ${formData.name}`,
        //   repeatFrequency: formData.repeatType,
        //   repeatMetadata: repeatMetadata,
        //   repeatDaily: formData.repeatType === 'daily',
        //   customRepeatMinutes: customMins,
        //   notificationType: 'admin_reminder',
        //   navigationData: navData
        // };
        // 
        // console.log('📱 Scheduling local notification with data:', JSON.stringify(localPayload, null, 2));
        // result = await AlertNotificationService.scheduleAlert(localPayload);
        // console.log('📱 Local notification result:', result);
        console.log('📱 Local notification SKIPPED — relying on backend FCM only');
        result = { success: true };

      } else {
        // Employee logic (optional, keeping local scheduling for now)
        console.log('👤 Employee user — scheduling via ReminderNotificationService');
        result = await ReminderNotificationService.scheduleReminder(reminderData);
        console.log('📱 Employee notification result:', result);
      }

      if (result.success) {
        console.log('🎉 Reminder sequence completed successfully');
        // Also store legacy format for existing screens that might still check AsyncStorage
        const localReminder = {
          id: reminderData.id,
          leadId: enquiry._id || null,
          enquiryType: enquiry.enquiryType || 'ManualInquiry',
          clientName: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          comment: formData.note || `Reminder for ${formData.name}`,
          reminderDateTime: reminderDateTime,
          title: `Reminder: ${formData.name}`,
          status: 'pending',
          priority: 'medium',
          source: 'local',
          triggered: false,
          repeatType: formData.repeatType,
          createdAt: new Date().toISOString(),
          notificationId: reminderData.id, // Link to notification
        };

        // Store in AsyncStorage for backward compatibility
        const existingReminders = await AsyncStorage.getItem('localReminders');
        const reminderList = existingReminders ? JSON.parse(existingReminders) : [];
        reminderList.push(localReminder);
        await AsyncStorage.setItem('localReminders', JSON.stringify(reminderList));

        // Get repeat label for display
        const repeatLabel = REPEAT_OPTIONS.find(opt => opt.value === formData.repeatType)?.label || 'No Repeat';

        CrossPlatformAlert.alert(
          '✅ Reminder Set Successfully!',
          `🔔 Notification scheduled for: ${formData.name}\n📅 Date & Time: ${reminderDate.toLocaleString('en-IN')}\n🔄 Repeat: ${repeatLabel}\n\n✅ You will receive notification even if app is KILLED or in background via FCM!`,
          [{
            text: 'Perfect!',
            onPress: handleClose,
            style: 'default'
          }]
        );
        onSuccess && onSuccess();
      } else {
        console.error('❌ Notification scheduling failed:', result);
        const errorMessage = result.error || result.message || 'Unknown error';

        // Provide specific error guidance
        let userMessage = 'Failed to schedule notification.\n\n';

        if (errorMessage.includes('permission')) {
          userMessage += '⚠️ Notification permissions may not be granted.\n\nPlease enable:\n• Notifications\n• Alarms & reminders\n\nin app settings.';
        } else if (errorMessage.includes('past')) {
          userMessage += '⏰ The selected time is in the past. Please choose a future date and time.';
        } else if (errorMessage.includes('channel')) {
          userMessage += '📢 Notification channel error. Please restart the app and try again.';
        } else {
          userMessage += `Error: ${errorMessage}\n\nTry:\n1. Restart the app\n2. Check notification settings\n3. Contact support if issue persists`;
        }

        CrossPlatformAlert.alert(
          'Failed to Set Reminder',
          userMessage,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Reminder creation error:', error);
      const errorMsg = error.message || error.toString();
      CrossPlatformAlert.alert(
        'Error',
        `Failed to create reminder.\n\n${errorMsg}\n\nPlease check:\n• Network connection\n• Notification permissions\n• App settings`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      date: '',
      hour: '1',
      minute: '00',
      period: 'AM',
      note: '',
      repeatType: 'none',
    });
    setShowRepeatDropdown(false);
    onClose();
  };

  if (!enquiry) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Reminder</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={loading}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter name"
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(value) => handleInputChange('location', value)}
                placeholder="Enter location"
              />
            </View>

            {/* Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={formData.date}
                onChangeText={(value) => handleInputChange('date', value)}
                placeholder="dd-mm-yyyy"
              />
            </View>

            {/* Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time</Text>
              <View style={styles.timeRow}>
                {/* Hour */}
                <View style={styles.timeDropdown}>
                  <ScrollView
                    style={styles.dropdown}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {hours.map((hour) => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.dropdownItem,
                          formData.hour === hour && styles.dropdownItemActive,
                        ]}
                        onPress={() => handleInputChange('hour', hour)}
                      >
                        <Text style={[
                          styles.dropdownText,
                          formData.hour === hour && styles.dropdownTextActive,
                        ]}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={styles.timeSeparator}>:</Text>

                {/* Minute */}
                <View style={styles.timeDropdown}>
                  <ScrollView
                    style={styles.dropdown}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {minutes.map((minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.dropdownItem,
                          formData.minute === minute && styles.dropdownItemActive,
                        ]}
                        onPress={() => handleInputChange('minute', minute)}
                      >
                        <Text style={[
                          styles.dropdownText,
                          formData.minute === minute && styles.dropdownTextActive,
                        ]}>
                          {minute}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Period */}
                <View style={styles.timeDropdown}>
                  <ScrollView
                    style={styles.dropdown}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {['AM', 'PM'].map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.dropdownItem,
                          formData.period === period && styles.dropdownItemActive,
                        ]}
                        onPress={() => handleInputChange('period', period)}
                      >
                        <Text style={[
                          styles.dropdownText,
                          formData.period === period && styles.dropdownTextActive,
                        ]}>
                          {period}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Note */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Note</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.note}
                onChangeText={(value) => handleInputChange('note', value)}
                placeholder="Enter note"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Repeat Options Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🔄 Repeat Reminder</Text>
              <TouchableOpacity
                style={styles.repeatSelectButton}
                onPress={() => setShowRepeatDropdown(!showRepeatDropdown)}
              >
                <Text style={styles.repeatSelectIcon}>
                  {REPEAT_OPTIONS.find(opt => opt.value === formData.repeatType)?.icon || '❤️'}
                </Text>
                <Text style={styles.repeatSelectText}>
                  {REPEAT_OPTIONS.find(opt => opt.value === formData.repeatType)?.label || 'Select Repeat'}
                </Text>
                <Text style={styles.repeatArrow}>{showRepeatDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showRepeatDropdown && (
                <View style={styles.repeatDropdownContainer}>
                  <ScrollView
                    style={styles.repeatDropdown}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {REPEAT_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.repeatDropdownItem,
                          formData.repeatType === option.value && styles.repeatDropdownItemActive,
                        ]}
                        onPress={() => {
                          handleInputChange('repeatType', option.value);
                          setShowRepeatDropdown(false);
                        }}
                      >
                        <Text style={styles.repeatIcon}>{option.icon}</Text>
                        <Text style={[
                          styles.repeatDropdownText,
                          formData.repeatType === option.value && styles.repeatDropdownTextActive,
                        ]}>
                          {option.label}
                        </Text>
                        {formData.repeatType === option.value && (
                          <Text style={styles.repeatCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Custom Interval Input */}
              {showCustomInput && (
                <View style={styles.customIntervalContainer}>
                  <Text style={styles.customIntervalLabel}>Set interval (in minutes):</Text>
                  <View style={styles.customIntervalRow}>
                    <TextInput
                      style={styles.customIntervalInput}
                      keyboardType="numeric"
                      value={String(formData.customIntervalMinutes)}
                      onChangeText={(value) => {
                        // Allow empty string or zero while typing, don't force '1' immediately
                        const val = value.replace(/[^0-9]/g, '');
                        handleInputChange('customIntervalMinutes', val);
                      }}
                      placeholder=""
                    />
                    <Text style={styles.customIntervalUnit}>minutes</Text>
                  </View>
                  <Text style={styles.customIntervalPreview}>
                    Preview: {getCustomLabel()}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
  },
  formContainer: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeDropdown: {
    flex: 1,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#ffffff',
    maxHeight: 100,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemActive: {
    backgroundColor: '#3b82f6',
  },
  dropdownText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  dropdownTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Repeat Options Dropdown Styles
  repeatSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  repeatSelectIcon: {
    fontSize: 18,
  },
  repeatSelectText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  repeatArrow: {
    fontSize: 12,
    color: '#6b7280',
  },
  repeatDropdownContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  repeatDropdown: {
    maxHeight: 150,
  },
  repeatDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  repeatDropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  repeatIcon: {
    fontSize: 16,
  },
  repeatDropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  repeatDropdownTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  repeatCheckmark: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '700',
  },
  // Custom interval styles
  customIntervalContainer: {
    marginTop: 12,
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
  customIntervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customIntervalInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#0369a1',
    textAlign: 'center',
  },
  customIntervalUnit: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  customIntervalHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  customIntervalPreview: {
    fontSize: 13,
    color: '#0369a1',
    marginTop: 8,
    fontWeight: '600',
  },
});

export default ReminderModal;