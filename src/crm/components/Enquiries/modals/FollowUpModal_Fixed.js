/**
 * Follow-up Modal Component
 * Comprehensive form for creating follow-ups with full CRM features
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
import { createFollowUp } from '../../../services/crmEnquiryApi';
import CrossPlatformAlert from '../../../../utils/crossPlatformAlert';

const FollowUpModal = ({ visible, onClose, enquiry, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    caseStatus: 'Open',
    priority: 'Medium',
    actionTaken: 'Other',
    nextFollowUpDate: new Date().toISOString().split('T')[0],
    initialComment: '',
  });

  const caseStatuses = ['Open', 'In Progress', 'On Hold', 'Closed', 'Cancelled'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  const actionTypes = ['Called', 'Emailed', 'Site Visit', 'Meeting', 'WhatsApp', 'Other'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.nextFollowUpDate) {
      CrossPlatformAlert.alert('Validation Error', 'Please select next follow-up date');
      return false;
    }

    if (!formData.initialComment.trim()) {
      CrossPlatformAlert.alert('Validation Error', 'Please add initial comment');
      return false;
    }

    // Check if date is not in the past
    const selectedDate = new Date(formData.nextFollowUpDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      CrossPlatformAlert.alert('Validation Error', 'Next follow-up date cannot be in the past');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !enquiry) return;

    setLoading(true);

    try {
      const followUpData = {
        leadId: enquiry._id,
        enquiryType: enquiry.enquiryType || (enquiry.source === 'client' ? 'Inquiry' : 'ManualInquiry'),
        clientName: enquiry.clientName,
        phone: enquiry.contactNumber,
        email: enquiry.email,
        propertyType: enquiry.propertyType,
        location: enquiry.propertyLocation,
        caseStatus: formData.caseStatus,
        priority: formData.priority.toLowerCase(),
        actionTaken: formData.actionTaken,
        nextFollowUpDate: new Date(formData.nextFollowUpDate).toISOString(),
        initialComment: formData.initialComment,
        status: 'pending',
        source: enquiry.source || 'manual',
      };

      const result = await createFollowUp(followUpData);

      if (result.success) {
        CrossPlatformAlert.alert('Success', 'Follow-up created successfully!', [
          { text: 'OK', onPress: handleClose }
        ]);
        onSuccess && onSuccess();
      } else {
        CrossPlatformAlert.alert('Error', result.message || 'Failed to create follow-up');
      }
    } catch (error) {
      console.error('Follow-up creation error:', error);
      CrossPlatformAlert.alert('Error', 'Failed to create follow-up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      caseStatus: 'Open',
      priority: 'Medium',
      actionTaken: 'Other',
      nextFollowUpDate: new Date().toISOString().split('T')[0],
      initialComment: '',
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
            <View style={styles.headerLeft}>
              <Text style={styles.modalTitle}>Create Follow-up</Text>
              <View style={styles.enquiryBadge}>
                <Text style={styles.enquiryBadgeText}>Enquiry Lead</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={loading}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Lead Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>👤</Text>
                <Text style={styles.sectionTitle}>Lead Information</Text>
              </View>
              
              <View style={styles.leadInfoGrid}>
                <View style={styles.infoRow}>
                  <View style={styles.infoField}>
                    <Text style={styles.infoLabel}>CLIENT NAME</Text>
                    <Text style={styles.infoValue}>{enquiry.clientName || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoField}>
                    <Text style={styles.infoLabel}>PHONE</Text>
                    <Text style={styles.infoValue}>{enquiry.contactNumber || 'N/A'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoRow}>
                  <View style={styles.infoField}>
                    <Text style={styles.infoLabel}>EMAIL</Text>
                    <Text style={styles.infoValue}>{enquiry.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoField}>
                    <Text style={styles.infoLabel}>PROPERTY TYPE</Text>
                    <Text style={styles.infoValue}>{enquiry.propertyType || 'N/A'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoRowSingle}>
                  <View style={styles.infoField}>
                    <Text style={styles.infoLabel}>LOCATION</Text>
                    <Text style={styles.infoValue}>{enquiry.propertyLocation || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Follow-up Details Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>📋</Text>
                <Text style={styles.sectionTitle}>Follow-up Details</Text>
              </View>

              {/* Case Status, Priority, Action Taken Row */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Case Status <Text style={styles.required}>*</Text></Text>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    <View style={styles.dropdown}>
                      {caseStatuses.map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.dropdownOption,
                            formData.caseStatus === status && styles.dropdownOptionActive,
                          ]}
                          onPress={() => handleInputChange('caseStatus', status)}
                        >
                          <Text style={[
                            styles.dropdownText,
                            formData.caseStatus === status && styles.dropdownTextActive,
                          ]}>
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Priority</Text>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    <View style={styles.dropdown}>
                      {priorities.map((priority) => (
                        <TouchableOpacity
                          key={priority}
                          style={[
                            styles.dropdownOption,
                            formData.priority === priority && styles.dropdownOptionActive,
                          ]}
                          onPress={() => handleInputChange('priority', priority)}
                        >
                          <Text style={[
                            styles.dropdownText,
                            formData.priority === priority && styles.dropdownTextActive,
                          ]}>
                            {priority}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Action Taken and Next Follow-up Date Row */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Action Taken</Text>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    <View style={styles.dropdown}>
                      {actionTypes.map((action) => (
                        <TouchableOpacity
                          key={action}
                          style={[
                            styles.dropdownOption,
                            formData.actionTaken === action && styles.dropdownOptionActive,
                          ]}
                          onPress={() => handleInputChange('actionTaken', action)}
                        >
                          <Text style={[
                            styles.dropdownText,
                            formData.actionTaken === action && styles.dropdownTextActive,
                          ]}>
                            {action}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Next Follow-up Date</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="dd-mm-yyyy ----"
                    value={formData.nextFollowUpDate}
                    onChangeText={(value) => handleInputChange('nextFollowUpDate', value)}
                  />
                </View>
              </View>

              {/* Initial Comment */}
              <View style={styles.commentSection}>
                <Text style={styles.formLabel}>Initial Comment</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add your initial comment about this follow-up..."
                  value={formData.initialComment}
                  onChangeText={(value) => handleInputChange('initialComment', value)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.createButtonText}>CREATE FOLLOW-UP</Text>
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
    backgroundColor: '#8b5cf6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  enquiryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  enquiryBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  scrollContainer: {
    maxHeight: 500,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  leadInfoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoRowSingle: {
    flexDirection: 'row',
  },
  infoField: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  formField: {
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  dropdownScroll: {
    maxHeight: 120,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionActive: {
    backgroundColor: '#3b82f6',
  },
  dropdownText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  commentSection: {
    marginTop: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    height: 100,
    textAlignVertical: 'top',
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
    borderRadius: 8,
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
  createButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default FollowUpModal;