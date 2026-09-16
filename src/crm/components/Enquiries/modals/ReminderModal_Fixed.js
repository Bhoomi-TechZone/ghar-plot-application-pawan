/**
 * Reminder Modal Component
 * Simple form for creating reminders
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
import { createReminder, createReminderFromLead } from '../../../services/crmEnquiryApi';
import { createReminderDateTime, extractClientInfo, convertTo24Hour } from '../../../services/reminderService';
import CrossPlatformAlert from '../../../../utils/crossPlatformAlert';

const ReminderModal = ({ visible, onClose, enquiry, onSuccess }) => {
  const [loading, setLoading] = useState(false);
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
  });

  // Populate form when enquiry changes
  React.useEffect(() => {
    if (enquiry) {
      const clientInfo = extractClientInfo(enquiry);
      setFormData({
        name: clientInfo.name,
        email: clientInfo.email,
        phone: clientInfo.phone,
        location: clientInfo.location,
        date: new Date().toISOString().split('T')[0],
        hour: '1',
        minute: '00',
        period: 'AM',
        note: '',
      });
    }
  }, [enquiry]);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = ['00', '15', '30', '45'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
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

    // Validate date format and future date
    const selectedDate = new Date(formData.date);
    if (isNaN(selectedDate.getTime())) {
      CrossPlatformAlert.alert('Validation Error', 'Please enter a valid date');
      return false;
    }

    const { hour: hour24, minute: min } = convertTo24Hour(formData.hour, formData.minute, formData.period);
    const selectedDateTime = new Date(formData.date);
    selectedDateTime.setHours(hour24, min, 0, 0);
    
    const now = new Date();
    const bufferTime = new Date(now.getTime() + 5 * 60000);
    
    if (selectedDateTime < bufferTime) {
      CrossPlatformAlert.alert('Validation Error', 'Please select a future date and time (at least 5 minutes from now)');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !enquiry) return;

    setLoading(true);

    try {
      const reminderDateTime = createReminderDateTime(
        formData.date,
        formData.hour,
        formData.minute,
        formData.period
      );

      const isExistingCustomer = enquiry.source === 'client' || enquiry.enquiryType === 'Inquiry';
      
      let reminderData;
      let result;

      if (isExistingCustomer) {
        reminderData = {
          leadId: enquiry._id,
          enquiryType: enquiry.enquiryType || 'Inquiry',
          clientName: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          propertyId: enquiry.propertyId,
          buyerId: enquiry.buyerId,
          comment: formData.note || `Reminder for existing customer: ${formData.name}`,
          reminderDateTime,
          title: `Customer Reminder: ${formData.name}`,
          status: 'pending',
          priority: 'medium',
          source: 'existing_customer'
        };
        
        result = await createReminderFromLead(reminderData);
      } else {
        reminderData = {
          leadId: enquiry._id,
          enquiryType: enquiry.enquiryType || 'ManualInquiry',
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          comment: formData.note || `Follow up with ${formData.name}`,
          reminderDateTime,
          title: `Reminder for ${formData.name}`,
          status: 'pending',
          priority: 'medium',
          source: 'manual_enquiry'
        };
        
        result = await createReminder(reminderData);
      }

      if (result.success) {
        const message = isExistingCustomer 
          ? 'Reminder set successfully for existing customer!' 
          : 'Reminder created successfully!';
        CrossPlatformAlert.alert('Success', message, [
          { text: 'OK', onPress: handleClose }
        ]);
        onSuccess && onSuccess();
      } else {
        CrossPlatformAlert.alert('Error', result.message || 'Failed to create reminder');
      }
    } catch (error) {
      console.error('Reminder creation error:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to create reminder. Please try again.');
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
    });
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
});

export default ReminderModal;