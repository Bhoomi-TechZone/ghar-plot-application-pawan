import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { createEmployee, getRoles } from '../../services/crmEmployeeManagementApi';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const AddEmployeeModal = ({ visible, onClose, onEmployeeAdded }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    department: '',
    giveAdminAccess: false,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
  });

  const [roles, setRoles] = useState([]);

  const [errors, setErrors] = useState({});

  // Reset form when modal closes
  useEffect(() => {
    console.log('🎯 AddEmployeeModal visible changed:', visible);
    if (!visible) {
      resetForm();
    } else {
      console.log('📋 Modal opened - fetching roles...');
      // Fetch roles when modal opens
      loadRoles();
    }
  }, [visible]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      password: '',
      department: '',
      giveAdminAccess: false,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
    });
    setErrors({});
  };

  const loadRoles = async () => {
    try {
      const result = await getRoles();
      if (result.success) {
        setRoles(result.data);
        console.log('✅ Roles loaded successfully:', result.data.length);
      } else {
        // Use fallback roles - this is expected and not an error
        console.log('ℹ️ Using fallback roles (API not available)');
        setRoles(result.data); // Fallback roles from API response
      }
    } catch (error) {
      console.log('ℹ️ Using fallback roles due to error:', error.message);
      // Use static fallback roles
      setRoles([
        { _id: 'agent', name: 'Agent' },
        { _id: 'manager', name: 'Manager' }, 
        { _id: 'lead', name: 'Team Lead' },
        { _id: 'sales', name: 'Sales Executive' },
        { _id: 'service', name: 'Customer Service' },
        { _id: 'admin', name: 'Admin' },
      ]);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      CrossPlatformAlert.alert('Validation Error', 'Please fix all errors before submitting.');
      return;
    }

    try {
      setLoading(true);

      // Prepare employee data for backend - match backend controller exactly
      const employeeData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role, // Backend expects role ID
        password: formData.password,
        department: formData.department.trim(),
        address: {
          street: formData.address.street.trim() || '',
          city: formData.address.city.trim() || '',
          state: formData.address.state.trim() || '',
          zipCode: formData.address.zipCode.trim() || '',
          country: formData.address.country.trim() || '',
        },
        giveAdminAccess: formData.giveAdminAccess || false, // Backend expects this field name
      };

      console.log('📝 Creating employee with backend-compatible data:', employeeData);

      const result = await createEmployee(employeeData);
      
      if (result.success) {
        CrossPlatformAlert.alert(
          'Success', 
          `Employee ${formData.name} has been created successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                onEmployeeAdded?.();
                onClose();
              },
            },
          ]
        );
      } else {
        // Show error message from API
        CrossPlatformAlert.alert(
          'Error Creating Employee',
          result.message || 'Failed to create employee. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Create employee error:', error);
      CrossPlatformAlert.alert(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const updateAddressData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Employee</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>
                  Full Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="Enter full name"
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                  placeholderTextColor="#9ca3af"
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Enter email address"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>
                  Phone <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  placeholder="Enter 10-11 digit phone number"
                  value={formData.phone}
                  onChangeText={(value) => updateFormData('phone', value)}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>
                  Role <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.pickerContainer, errors.role && styles.inputError]}>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value) => updateFormData('role', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a role" value="" />
                    {roles.map((role) => (
                      <Picker.Item key={role._id} label={role.name} value={role._id} />
                    ))}
                  </Picker>
                </View>
                {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
              </View>
            </View>

            <View style={styles.adminAccessContainer}>
              <View style={styles.adminAccessInfo}>
                <Icon name="warning" size={16} color="#f59e0b" />
                <Text style={styles.adminAccessLabel}>Give Admin Access</Text>
              </View>
              <Switch
                value={formData.giveAdminAccess}
                onValueChange={(value) => updateFormData('giveAdminAccess', value)}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor={formData.giveAdminAccess ? '#ffffff' : '#f9fafb'}
              />
            </View>
            <Text style={styles.adminAccessDescription}>
              When checked, this employee will have full admin-level access to all features and data.
            </Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>
                  Password <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  placeholder="Enter password"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  secureTextEntry
                  placeholderTextColor="#9ca3af"
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Department</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter department"
                  value={formData.department}
                  onChangeText={(value) => updateFormData('department', value)}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Address Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Street</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter street address"
                value={formData.address.street}
                onChangeText={(value) => updateAddressData('street', value)}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter city"
                  value={formData.address.city}
                  onChangeText={(value) => updateAddressData('city', value)}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter state"
                  value={formData.address.state}
                  onChangeText={(value) => updateAddressData('state', value)}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Zip Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter zip code"
                  value={formData.address.zipCode}
                  onChangeText={(value) => updateAddressData('zipCode', value)}
                  keyboardType="number-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter country"
                  value={formData.address.country}
                  onChangeText={(value) => updateAddressData('country', value)}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Create Employee</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 24,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    height: 44,
    color: '#374151',
  },
  adminAccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  adminAccessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminAccessLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400e',
    marginLeft: 8,
  },
  adminAccessDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});

export default AddEmployeeModal;