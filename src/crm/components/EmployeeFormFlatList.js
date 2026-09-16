import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');

const EmployeeFormFlatList = ({
  isEditing = false,
  initialData = null,
  roles = [],
  onSubmit,
  onCancel,
  submitting = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirmPassword: '',
    department: '',
    giveAdminAccess: false,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
    },
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Initialize form with editing data
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        role: initialData.roleId || initialData.role || '',
        password: '',
        confirmPassword: '',
        department: initialData.department || '',
        giveAdminAccess: initialData.giveAdminAccess || false,
        address: initialData.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'India',
        },
      });
    }
  }, [isEditing, initialData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        newErrors.phone = 'Phone must be 10-11 digits';
      }
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (!isEditing) {
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required for new employees';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (formData.password.trim()) {
        if (formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        if (!formData.confirmPassword.trim()) {
          newErrors.confirmPassword = 'Please confirm new password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const submitData = { ...formData };

    if (isEditing && !submitData.password.trim()) {
      delete submitData.password;
      delete submitData.confirmPassword;
    } else {
      delete submitData.confirmPassword;
    }

    onSubmit(submitData);
  };

  const formFields = [
    { section: 'Personal Information', key: 'section1' },
    { key: 'name', label: 'Full Name', required: true, placeholder: 'Enter full name' },
    { key: 'email', label: 'Email Address', required: true, placeholder: 'Enter email address', keyboardType: 'email-address' },
    { key: 'phone', label: 'Phone Number', required: true, placeholder: 'Enter phone number', keyboardType: 'phone-pad' },
    
    { section: 'Role & Access', key: 'section2' },
    { key: 'role', label: 'Select Role', required: true, type: 'selector' },
    { key: 'department', label: 'Department', required: true, placeholder: 'e.g., Sales, Support' },
    { key: 'adminAccess', label: 'Admin Access', type: 'toggle' },
    
    { section: `${isEditing ? 'Change Password (Optional)' : 'Password'}`, key: 'section3' },
    { key: 'password', label: 'Password', required: !isEditing, type: 'password', placeholder: 'Enter password' },
    { key: 'confirmPassword', label: `${isEditing ? 'Confirm New Password' : 'Confirm Password'}`, required: !isEditing, type: 'password', placeholder: 'Confirm password' },
    
    { section: 'Address Information', key: 'section4' },
    { key: 'street', label: 'Street Address', placeholder: 'Enter street address', type: 'address' },
    { key: 'city', label: 'City', placeholder: 'Enter city', type: 'address' },
    { key: 'state', label: 'State', placeholder: 'Enter state', type: 'address' },
    { key: 'zipCode', label: 'ZIP Code', placeholder: 'Enter ZIP code', keyboardType: 'numeric', type: 'address' },
    { key: 'country', label: 'Country', placeholder: 'Enter country', type: 'address' },
    
    { key: 'actions', type: 'actions' },
  ];

  const renderItem = ({ item }) => {
    if (item.section) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.section}</Text>
        </View>
      );
    }

    if (item.type === 'toggle') {
      return (
        <View style={styles.formGroup}>
          <View style={styles.toggleContainer}>
            <Text style={styles.label}>{item.label}</Text>
            <Switch
              value={formData.giveAdminAccess}
              onValueChange={value => handleInputChange('giveAdminAccess', value)}
              disabled={submitting}
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              thumbColor={formData.giveAdminAccess ? '#10b981' : '#f3f4f6'}
            />
          </View>
        </View>
      );
    }

    if (item.type === 'selector') {
      return (
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {item.label}
            {item.required && <Text style={styles.required}> *</Text>}
          </Text>
          <TouchableOpacity
            style={[styles.selectorButton, errors[item.key] && styles.inputError]}
            onPress={() => setShowRoleModal(true)}
            disabled={submitting}
          >
            <Text
              style={[
                styles.selectorText,
                !formData.role && styles.placeholderText,
              ]}
            >
              {formData.role
                ? roles.find(r => r._id === formData.role)?.name || 'Select Role'
                : 'Select Role'}
            </Text>
            <Icon name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          {errors[item.key] && (
            <Text style={styles.errorText}>
              <Icon name="alert-circle" size={12} color="#ef4444" /> {errors[item.key]}
            </Text>
          )}
          
          {/* Role Selection Modal */}
          <Modal
            visible={showRoleModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowRoleModal(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowRoleModal(false)}
            >
              <View style={styles.roleModalContainer}>
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  {/* Modal Header */}
                  <View style={styles.roleModalHeader}>
                    <Text style={styles.roleModalTitle}>Select Role</Text>
                    <TouchableOpacity
                      onPress={() => setShowRoleModal(false)}
                      style={styles.roleModalCloseBtn}
                    >
                      <Icon name="close" size={24} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Role Options */}
                  <ScrollView style={styles.roleOptionsContainer} showsVerticalScrollIndicator={false}>
                    {roles.length > 0 ? (
                      roles.map((role, index) => (
                        <TouchableOpacity
                          key={role._id || index}
                          style={[
                            styles.roleOptionItem,
                            formData.role === role._id && styles.roleOptionSelected,
                          ]}
                          onPress={() => {
                            handleInputChange('role', role._id);
                            setShowRoleModal(false);
                          }}
                        >
                          <View style={styles.roleOptionContent}>
                            <View style={[
                              styles.roleIcon,
                              formData.role === role._id && styles.roleIconSelected
                            ]}>
                              <Icon 
                                name={formData.role === role._id ? "checkmark-circle" : "person-outline"} 
                                size={20} 
                                color={formData.role === role._id ? "#ffffff" : "#3b82f6"} 
                              />
                            </View>
                            <Text style={[
                              styles.roleOptionText,
                              formData.role === role._id && styles.roleOptionTextSelected
                            ]}>
                              {role.name}
                            </Text>
                          </View>
                          {formData.role === role._id && (
                            <Icon name="checkmark" size={20} color="#3b82f6" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.noRolesContainer}>
                        <Icon name="alert-circle-outline" size={40} color="#9ca3af" />
                        <Text style={styles.noRolesText}>No roles available</Text>
                      </View>
                    )}
                  </ScrollView>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      );
    }

    if (item.type === 'password') {
      const isPasswordField = item.key === 'password';
      const showPasswordState = isPasswordField ? showPassword : showConfirmPassword;
      
      return (
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {item.label}
            {item.required && <Text style={styles.required}> *</Text>}
          </Text>
          <View style={[styles.passwordContainer, errors[item.key] && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              value={formData[item.key]}
              onChangeText={value => handleInputChange(item.key, value)}
              placeholder={item.placeholder}
              secureTextEntry={!showPasswordState}
              placeholderTextColor="#9ca3af"
              editable={!submitting}
              blurOnSubmit={false}
              multiline={false}
            />
            <TouchableOpacity
              onPress={() => 
                isPasswordField 
                  ? setShowPassword(!showPassword)
                  : setShowConfirmPassword(!showConfirmPassword)
              }
              style={styles.eyeIcon}
            >
              <Icon
                name={showPasswordState ? 'eye' : 'eye-off'}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
          {errors[item.key] && (
            <Text style={styles.errorText}>
              <Icon name="alert-circle" size={12} color="#ef4444" /> {errors[item.key]}
            </Text>
          )}
        </View>
      );
    }

    if (item.type === 'address') {
      return (
        <View style={styles.formGroup}>
          <Text style={styles.label}>{item.label}</Text>
          <TextInput
            style={styles.input}
            value={formData.address[item.key]}
            onChangeText={value => handleAddressChange(item.key, value)}
            placeholder={item.placeholder}
            placeholderTextColor="#9ca3af"
            editable={!submitting}
            blurOnSubmit={false}
            keyboardType={item.keyboardType}
            multiline={false}
          />
        </View>
      );
    }

    if (item.type === 'actions') {
      return (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#6b7280" />
            ) : (
              <>
                <Icon name="close" size={18} color="#6b7280" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Icon name="checkmark" size={18} color="#ffffff" />
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update Employee' : 'Create Employee'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // Regular text input
    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {item.label}
          {item.required && <Text style={styles.required}> *</Text>}
        </Text>
        <TextInput
          style={[styles.input, errors[item.key] && styles.inputError]}
          value={formData[item.key]}
          onChangeText={value => handleInputChange(item.key, value)}
          placeholder={item.placeholder}
          placeholderTextColor="#9ca3af"
          editable={!submitting}
          blurOnSubmit={false}
          keyboardType={item.keyboardType || 'default'}
          autoCapitalize={item.key === 'email' ? 'none' : 'sentences'}
          multiline={false}
        />
        {errors[item.key] && (
          <Text style={styles.errorText}>
            <Icon name="alert-circle" size={12} color="#ef4444" /> {errors[item.key]}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={formFields}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        scrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  sectionHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },

  formGroup: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },

  required: {
    color: '#ef4444',
    fontWeight: '600',
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },

  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingRight: 12,
  },

  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
  },

  eyeIcon: {
    padding: 8,
  },

  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    fontWeight: '500',
  },

  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
  },

  selectorText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },

  placeholderText: {
    color: '#9ca3af',
    fontWeight: '400',
  },

  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  actionSection: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },

  submitButton: {
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },

  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },

  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },

  // Role Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  roleModalContainer: {
    width: screenWidth * 0.85,
    maxHeight: '70%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  roleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },

  roleModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },

  roleModalCloseBtn: {
    padding: 4,
  },

  roleOptionsContainer: {
    maxHeight: 350,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  roleOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  roleOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },

  roleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  roleIconSelected: {
    backgroundColor: '#3b82f6',
  },

  roleOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  roleOptionTextSelected: {
    color: '#3b82f6',
  },

  noRolesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  noRolesText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
});

export default EmployeeFormFlatList;
