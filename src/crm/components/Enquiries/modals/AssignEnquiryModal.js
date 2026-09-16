/**
 * Assign Enquiry Modal Component
 * Form for manual assignment of enquiries to employees
 */
import React, { useState, useEffect } from 'react';
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
// import Icon from 'react-native-vector-icons/MaterialIcons';
import { assignEnquiriesToEmployee } from '../../../services/assignmentService';
import { getAllEmployees } from '../../../services/crmEmployeeManagementApi';
import CrossPlatformAlert from '../../../../utils/crossPlatformAlert';

const AssignEnquiryModal = ({ visible, onClose, selectedEnquiries, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');

  const priorities = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#ef4444' },
  ];

  useEffect(() => {
    if (visible) {
      fetchEmployees();
    }
  }, [visible]);

  const fetchEmployees = async () => {
    try {
      console.log('👥 Fetching ALL employees for assignment...');
      
      // Use getAllEmployees to get ALL employees without filters
      const result = await getAllEmployees({ 
        page: 1, 
        limit: 999, // Get up to 999 employees
        isActive: true // Only get active employees
      });
      
      if (result && result.employees && Array.isArray(result.employees)) {
        setEmployees(result.employees);
        console.log('✅ Employees fetched successfully:', result.employees.length);
        console.log('👥 Employee list:', result.employees.map(e => ({ id: e._id, name: e.fullName || e.name })));
      } else {
        console.warn('⚠️ No employees data returned:', result);
        CrossPlatformAlert.alert('Error', 'Failed to fetch employees');
        setEmployees([]);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      CrossPlatformAlert.alert('Error', 'Failed to fetch employees');
      setEmployees([]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      CrossPlatformAlert.alert('Error', 'Please select an employee');
      return;
    }

    setLoading(true);

    try {
      const assignmentData = {
        enquiries: selectedEnquiries,
        employeeId: selectedEmployee,
        priority,
        notes: notes || 'Manual assignment',
      };

      const result = await assignEnquiriesToEmployee(assignmentData);

      if (result.success) {
        CrossPlatformAlert.alert('Success', result.message, [
          { text: 'OK', onPress: handleClose }
        ]);
        onSuccess && onSuccess();
      } else {
        CrossPlatformAlert.alert('Error', result.message || 'Failed to assign enquiries');
      }
    } catch (error) {
      CrossPlatformAlert.alert('Error', 'Failed to assign enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedEmployee('');
    setPriority('medium');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Enquiries</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Text style={{ fontSize: 24, color: '#6b7280' }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.countText}>
              {selectedEnquiries.length} enquiries selected
            </Text>

            {/* Employee Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Employee *</Text>
              {employees.map((employee) => (
                <TouchableOpacity
                  key={employee._id}
                  style={[
                    styles.employeeOption,
                    selectedEmployee === employee._id && styles.employeeOptionActive,
                  ]}
                  onPress={() => setSelectedEmployee(employee._id)}
                >
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{employee.fullName || employee.name || 'Unknown Employee'}</Text>
                    <Text style={styles.employeeRole}>{employee.role?.name || employee.department || 'Employee'}</Text>
                  </View>
                  {selectedEmployee === employee._id && (
                    <Text style={{ fontSize: 20, color: '#3b82f6' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Priority Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Priority</Text>
              <View style={styles.priorityContainer}>
                {priorities.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.priorityOption,
                      priority === p.value && { backgroundColor: p.color },
                    ]}
                    onPress={() => setPriority(p.value)}
                  >
                    <Text style={[
                      styles.priorityText,
                      priority === p.value && styles.priorityTextActive,
                    ]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Assignment notes..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.buttonDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Assign Leads</Text>
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
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
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
    color: '#1f2937',
  },
  formContainer: {
    padding: 20,
  },
  countText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  employeeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  employeeOptionActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  employeeRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  priorityTextActive: {
    color: '#ffffff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AssignEnquiryModal;