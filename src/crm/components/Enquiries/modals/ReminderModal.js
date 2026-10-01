/**
 * Reminder Modal Component
 * UI is 100% copy of CreateAlertScreen.js
 * Backend logic preserved from original ReminderModal
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
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createReminder } from '../../../services/crmEnquiryApi';
import { updateReminder } from '../../../../services/api';
import { extractClientInfo } from '../../../services/reminderService';
import { getFCMToken } from '../../../../utils/fcmService';
import { BASE_URL } from '../../../../services/api';
import CrossPlatformAlert from '../../../../utils/crossPlatformAlert';

const ReminderModal = ({ visible, onClose, enquiry, reminderToEdit = null, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showCustomManualInput, setShowCustomManualInput] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    date: new Date(),
    time: (() => { const t = new Date(); t.setHours(10, 0, 0, 0); return t; })(),
    note: '',
    repeatFrequency: 'none',
    customIntervalMinutes: '',
  });

  // Preset custom interval options — same as CreateAlertScreen
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

  // ── Populate form ──
  React.useEffect(() => {
    if (reminderToEdit) {
      const remDate = new Date(reminderToEdit.reminderDateTime || reminderToEdit.scheduledDate || Date.now());
      const timeDate = new Date(remDate);
      setShowCustomInput(reminderToEdit.repeatType === 'custom');
      setFormData({
        name: reminderToEdit.clientName || enquiry?.clientName || '',
        email: reminderToEdit.email || enquiry?.email || '',
        phone: reminderToEdit.phone || enquiry?.contactNumber || '',
        location: reminderToEdit.location || enquiry?.propertyLocation || '',
        date: remDate,
        time: timeDate,
        note: reminderToEdit.note || reminderToEdit.comment || '',
        repeatFrequency: reminderToEdit.repeatType || (reminderToEdit.isRepeating ? 'daily' : 'none'),
        customIntervalMinutes: reminderToEdit.customIntervalMinutes ? reminderToEdit.customIntervalMinutes : '',
      });
    } else if (enquiry) {
      const clientInfo = extractClientInfo(enquiry);
      const defaultTime = new Date();
      defaultTime.setHours(10, 0, 0, 0);
      setShowCustomInput(false);
      setFormData({
        name: clientInfo.name || '',
        email: clientInfo.email || '',
        phone: clientInfo.phone || '',
        location: clientInfo.location || '',
        date: new Date(),
        time: defaultTime,
        note: '',
        repeatFrequency: 'none',
        customIntervalMinutes: '',
      });
    }
  }, [enquiry, reminderToEdit]);

  // ── Helpers — exact same as CreateAlertScreen ──
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setFormData(prev => ({ ...prev, date: selectedDate }));
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) setFormData(prev => ({ ...prev, time: selectedTime }));
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTimeForDisplay = (date) => {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${strHours}:${minutes} ${ampm}`;
  };

  const getRepeatLabel = () => {
    if (formData.repeatFrequency === 'custom') {
      const mins = formData.customIntervalMinutes;
      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return remainingMins > 0
          ? `Every ${hrs}h ${remainingMins}m`
          : `Every ${hrs} hour${hrs > 1 ? 's' : ''}`;
      }
      return mins ? `Every ${mins} minute${mins > 1 ? 's' : ''}` : 'Custom';
    }
    const labels = {
      none: 'Does not repeat',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return labels[formData.repeatFrequency] || 'Does not repeat';
  };

  const handleRepeatSelect = (frequency) => {
    setFormData(prev => ({ ...prev, repeatFrequency: frequency }));
    if (frequency === 'custom') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setShowRepeatModal(false);
    }
  };

  const handleCustomIntervalSelect = (minutes) => {
    setFormData(prev => ({ ...prev, customIntervalMinutes: minutes }));
    setShowCustomInput(false);
    setShowCustomManualInput(false);
    setShowRepeatModal(false);
  };

  const handleManualMinutesChange = (value) => {
    setManualMinutes(value.replace(/[^0-9]/g, ''));
  };

  const confirmManualMinutes = () => {
    const mins = parseInt(manualMinutes) || 60;
    handleCustomIntervalSelect(mins > 0 ? mins : 60);
  };

  // ── Validation ──
  const validateForm = () => {
    if (!formData.name.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter name');
      return false;
    }
    if (!formData.phone.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter phone number');
      return false;
    }
    return true;
  };

  // ── Submit — original backend logic, now using Date objects ──
  const handleSubmit = async () => {
    if (!validateForm() || !enquiry) return;
    setLoading(true);

    try {
      // Build reminderDate from date + time Date objects
      const dateOnly = new Date(formData.date);
      const timeOnly = new Date(formData.time);
      const reminderDate = new Date(
        dateOnly.getFullYear(),
        dateOnly.getMonth(),
        dateOnly.getDate(),
        timeOnly.getHours(),
        timeOnly.getMinutes(),
        0, 0
      );

      // Validate future date
      if (reminderDate <= new Date()) {
        CrossPlatformAlert.alert('Invalid Date', 'Please select a future date and time for the reminder');
        setLoading(false);
        return;
      }

      const customMins = formData.repeatFrequency === 'custom'
        ? (parseInt(formData.customIntervalMinutes) || 60)
        : null;

      const timeStr24 = `${String(timeOnly.getHours()).padStart(2, '0')}:${String(timeOnly.getMinutes()).padStart(2, '0')}`;
      const _dd = String(dateOnly.getDate()).padStart(2, '0');
      const _mm = String(dateOnly.getMonth() + 1).padStart(2, '0');
      const _yyyy = dateOnly.getFullYear();
      const dateForService = `${_yyyy}-${_mm}-${_dd}`;

      const assignedEmployeeId = enquiry.assignment?.employeeId?._id || enquiry.assignment?.employeeId || null;
      const adminToken = await AsyncStorage.getItem('adminToken') || await AsyncStorage.getItem('admin_token');
      const employeeToken = await AsyncStorage.getItem('employeeToken') || await AsyncStorage.getItem('employee_token');
      const crmToken = await AsyncStorage.getItem('crm_auth_token') || await AsyncStorage.getItem('token');
      const authToken = adminToken || employeeToken || crmToken;
      const isAdmin = !!adminToken;

      // Save to DB
      if (reminderToEdit) {
        const updatePayload = {
          title: `Follow up with ${formData.name}`,
          clientName: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          reminderDateTime: reminderDate.toISOString(),
          note: formData.note || `Follow up with ${formData.name}`,
          comment: formData.note || `Follow up with ${formData.name}`,
          isRepeating: formData.repeatFrequency !== 'none',
          repeatType: formData.repeatFrequency,
          customIntervalMinutes: customMins,
          enquiryId: enquiry._id,
          assignedEmployeeId,
        };
        await updateReminder(reminderToEdit._id || reminderToEdit.id, updatePayload);
      } else {
        await createReminder({
          title: `Follow up with ${formData.name}`,
          clientName: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          reminderDateTime: reminderDate.toISOString(),
          note: formData.note || `Follow up with ${formData.name} regarding property inquiry`,
          isRepeating: formData.repeatFrequency !== 'none',
          enquiryId: enquiry._id,
          repeatType: formData.repeatFrequency,
          customIntervalMinutes: customMins,
          assignedEmployeeId,
        });
      }

      // Schedule FCM notification via backend
      try {
        const fcmToken = await getFCMToken();
        const fcmPayload = {
          title: `Reminder: ${formData.name}`,
          reason: formData.note || `Follow up with ${formData.name}`,
          date: dateForService,
          time: timeStr24,
          scheduledDateTime: reminderDate.toISOString(),
          repeatFrequency: formData.repeatFrequency,
          repeatDaily: formData.repeatFrequency === 'daily',
          customRepeatMinutes: customMins,
          type: isAdmin ? 'admin_reminder' : 'reminder',
          notificationType: isAdmin ? 'admin_reminder' : 'reminder',
          fcmToken,
          enquiryId: enquiry._id,
          assignedEmployeeId,
          clientName: formData.name,
          phone: formData.phone,
        };

        await fetch(`${BASE_URL}/api/alerts/schedule-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(fcmPayload),
        });
      } catch (fcmErr) {
        console.warn('FCM scheduling error:', fcmErr);
      }

      // Save local copy in AsyncStorage
      try {
        const localReminder = {
          id: `reminder_${enquiry._id}_${Date.now()}`,
          leadId: enquiry._id || null,
          clientName: formData.name,
          phone: formData.phone,
          reminderDateTime: reminderDate.toISOString(),
          title: `Reminder: ${formData.name}`,
          status: 'pending',
          repeatType: formData.repeatFrequency,
          createdAt: new Date().toISOString(),
          source: 'local',
        };
        const existing = await AsyncStorage.getItem('localReminders');
        const list = existing ? JSON.parse(existing) : [];
        list.push(localReminder);
        await AsyncStorage.setItem('localReminders', JSON.stringify(list));
      } catch (_) {}

      CrossPlatformAlert.alert(
        reminderToEdit ? '✅ Reminder Updated!' : '✅ Reminder Set!',
        `🔔 Scheduled for: ${formData.name}\n📅 ${reminderDate.toLocaleString('en-IN')}\n🔄 Repeat: ${getRepeatLabel()}`,
        [{ text: 'Done', onPress: handleClose }]
      );
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Reminder error:', error);
      CrossPlatformAlert.alert('Error', `Failed to create reminder.\n\n${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    const defaultTime = new Date();
    defaultTime.setHours(10, 0, 0, 0);
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      date: new Date(),
      time: defaultTime,
      note: '',
      repeatFrequency: 'none',
      customIntervalMinutes: '',
    });
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowRepeatModal(false);
    setShowCustomInput(false);
    setShowCustomManualInput(false);
    setManualMinutes('');
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
            <Text style={styles.modalTitle}>
              {reminderToEdit ? 'Edit Reminder' : 'Set Reminder'}
            </Text>
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
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(v) => handleInputChange('name', v)}
                placeholder="Enter name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(v) => handleInputChange('email', v)}
                placeholder="Enter email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(v) => handleInputChange('phone', v)}
                placeholder="Enter phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(v) => handleInputChange('location', v)}
                placeholder="Enter location"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Note */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Note</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.note}
                onChangeText={(v) => handleInputChange('note', v)}
                placeholder="Enter note"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Date — exact same as CreateAlertScreen */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeText}>{formatDate(formData.date)}</Text>
                <Icon name="calendar-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formData.date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {/* Time — exact same as CreateAlertScreen */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Time <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeText}>{formatTimeForDisplay(formData.time)}</Text>
                <Icon name="time-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={formData.time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                is24Hour={false}
              />
            )}

            {/* Repeat — exact same as CreateAlertScreen */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Repeat</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowRepeatModal(true)}
              >
                <Text style={styles.dateTimeText}>{getRepeatLabel()}</Text>
                <Icon name="chevron-down-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              </TouchableOpacity>
            </View>

          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>
                  {reminderToEdit ? 'Update' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* Repeat Modal — exact same as CreateAlertScreen */}
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
          <View style={styles.repeatModalContent}>
            <Text style={styles.repeatModalTitle}>Repeat</Text>

            <ScrollView
              style={styles.repeatOptionsScroll}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {[
                { value: 'none', label: 'Does not repeat' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
                { value: 'custom', label: 'Custom' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.repeatOption,
                    formData.repeatFrequency === opt.value && styles.repeatOptionSelected,
                  ]}
                  onPress={() => handleRepeatSelect(opt.value)}
                >
                  <Text style={[
                    styles.repeatOptionText,
                    formData.repeatFrequency === opt.value && styles.repeatOptionTextSelected,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Custom Interval Presets */}
              {showCustomInput && (
                <View style={styles.customIntervalContainer}>
                  <Text style={styles.customIntervalLabel}>Select interval:</Text>
                  {customIntervalOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.customOptionItem,
                        formData.customIntervalMinutes === option.value && styles.customOptionItemSelected,
                      ]}
                      onPress={() => handleCustomIntervalSelect(option.value)}
                    >
                      <Text style={[
                        styles.customOptionItemText,
                        formData.customIntervalMinutes === option.value && styles.customOptionItemTextSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* + Add Custom manual input */}
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
    </Modal>
  );
};

/* ─────────────────────────────────────────────────────────────
   Styles — 100% identical to CreateAlertScreen.js styles
   (only modalContainer / modalContent / modalHeader adapted
    since this is a centered modal, not a full-page screen)
───────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // Outer wrapper (centered modal overlay)
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#f2f6ff',   // same as CreateAlertScreen container bg
    borderRadius: 16,
    maxHeight: '92%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#f2f6ff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 26,
    color: '#6b7280',
    lineHeight: 28,
  },

  // ── Form — identical to CreateAlertScreen ──
  formContainer: {
    padding: 20,
    maxHeight: 480,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    position: 'relative',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 45,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#374151',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
  },

  // ── Footer Buttons — identical to CreateAlertScreen ──
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Repeat Modal — identical to CreateAlertScreen ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  repeatModalContent: {
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
  repeatModalTitle: {
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

  // ── Custom interval — identical to CreateAlertScreen ──
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
});

export default ReminderModal;