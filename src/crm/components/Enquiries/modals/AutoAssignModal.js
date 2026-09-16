/**
 * Auto Assign Modal Component
 * Form for auto-assigning enquiries by roles
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
import { getAvailableRoles, getAvailableEmployees, autoAssignEnquiriesByRoles } from '../../../services/assignmentService';
import CrossPlatformAlert from '../../../../utils/crossPlatformAlert';

const AutoAssignModal = ({ visible, onClose, selectedEnquiries, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible]);

  const fetchData = async () => {
    try {
      const [rolesResult, employeesResult] = await Promise.all([
        getAvailableRoles(),
        getAvailableEmployees(),
      ]);

      if (rolesResult.success) {
        setRoles(rolesResult.data);
      }
      if (employeesResult.success) {
        setEmployees(employeesResult.data);
      }
    } catch (error) {
      CrossPlatformAlert.alert('Error', 'Failed to fetch data');
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const getEmployeesForRole = (roleId) => {
    return employees.filter(emp => emp.role?._id === roleId);
  };

  const getTotalEmployees = () => {
    const uniqueEmployees = new Set();
    selectedRoles.forEach(roleId => {
      getEmployeesForRole(roleId).forEach(emp => {
        uniqueEmployees.add(emp._id);
      });
    });
    return uniqueEmployees.size;
  };

  const handleSubmit = async () => {
    if (selectedRoles.length === 0) {
      CrossPlatformAlert.alert('Error', 'Please select at least one role');
      return;
    }

    const totalEmployees = getTotalEmployees();
    if (totalEmployees === 0) {
      CrossPlatformAlert.alert('Error', 'No employees found for selected roles');
      return;
    }

    setLoading(true);

    try {
      const result = await autoAssignEnquiriesByRoles(selectedEnquiries, selectedRoles, employees);

      if (result.success) {
        CrossPlatformAlert.alert('Auto Assignment Complete', result.message, [
          { text: 'OK', onPress: handleClose }
        ]);
        onSuccess && onSuccess();
      } else {
        CrossPlatformAlert.alert('Error', result.message || 'Failed to auto assign enquiries');
      }
    } catch (error) {
      CrossPlatformAlert.alert('Error', 'Failed to auto assign enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedRoles([]);
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
            <View style={styles.headerLeft}>
              <Text style={{ fontSize: 24, color: '#8b5cf6' }}>⚡</Text>
              <Text style={styles.modalTitle}>Auto Assign by Role</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Text style={{ fontSize: 24, color: '#6b7280' }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.countText}>
              {selectedEnquiries.length} enquiries selected
            </Text>

            {/* Role Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Roles</Text>
              {roles.map((role) => {
                const roleEmployees = getEmployeesForRole(role._id);
                const isSelected = selectedRoles.includes(role._id);
                
                return (
                  <TouchableOpacity
                    key={role._id}
                    style={[
                      styles.roleOption,
                      isSelected && styles.roleOptionActive,
                    ]}
                    onPress={() => toggleRole(role._id)}
                  >
                    <View style={styles.roleInfo}>
                      <Text style={styles.roleName}>{role.name}</Text>
                      <Text style={styles.roleCount}>
                        {roleEmployees.length} employee{roleEmployees.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      isSelected && styles.checkboxActive,
                    ]}>
                      {isSelected && <Text style={{ fontSize: 16, color: '#ffffff' }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Distribution Preview */}
            {selectedRoles.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Distribution Preview</Text>
                <View style={styles.previewContainer}>
                  <Text style={styles.previewText}>
                    Total Employees: {getTotalEmployees()}
                  </Text>
                  <Text style={styles.previewText}>
                    Enquiries per Employee: ~{Math.floor(selectedEnquiries.length / getTotalEmployees())}
                  </Text>
                  <Text style={styles.previewText}>
                    Remaining: {selectedEnquiries.length % getTotalEmployees()}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.buttonDisabled]} 
              onPress={handleSubmit}
              disabled={loading || selectedRoles.length === 0}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={{ fontSize: 18, color: '#ffffff' }}>⚡</Text>
                  <Text style={styles.submitButtonText}>Auto Assign</Text>
                </>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  roleOption: {
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
  roleOptionActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  roleCount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  previewContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
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
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
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

export default AutoAssignModal;