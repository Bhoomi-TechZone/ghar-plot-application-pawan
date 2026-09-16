import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Keyboard,
  Modal,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');

const EmployeeForm = ({
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

  // Prevent keyboard from being dismissed by native behaviors
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      // This will be called when keyboard hides, but we won't do anything
      // This helps us detect if keyboard is being dismissed unexpectedly
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

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

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        newErrors.phone = 'Phone must be 10-11 digits';
      }
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Password validation
    if (!isEditing) {
      // New employee - password is required
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
      // Editing - password is optional
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

    // Department validation
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

    // If editing and password is empty, remove password fields
    if (isEditing && !submitData.password.trim()) {
      delete submitData.password;
      delete submitData.confirmPassword;
    } else {
      // Remove confirmPassword from submission - backend doesn't need it
      delete submitData.confirmPassword;
    }

    onSubmit(submitData);
  };

  const FormInput = ({ label, field, required = false, ...props }) => (
    <View style={styles.formGroup}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
        value={formData[field]}
        onChangeText={value => handleInputChange(field, value)}
        placeholderTextColor="#9ca3af"
        editable={!submitting}
        blurOnSubmit={false}
        returnKeyType="default"
        multiline={false}
        {...props}
      />
      {errors[field] && (
        <Text style={styles.errorText}>
          <Icon name="alert-circle" size={12} color="#ef4444" /> {errors[field]}
        </Text>
      )}
    </View>
  );

  const PasswordInput = ({ label, field, required = false }) => (
    <View style={styles.formGroup}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>
      <View style={[styles.passwordContainer, errors[field] && styles.inputError]}>
        <TextInput
          style={styles.passwordInput}
          value={formData[field]}
          onChangeText={value => handleInputChange(field, value)}
          placeholder={field === 'password' ? 'Enter password' : 'Confirm password'}
          secureTextEntry={field === 'password' ? !showPassword : !showConfirmPassword}
          placeholderTextColor="#9ca3af"
          editable={!submitting}
          blurOnSubmit={false}
          returnKeyType="default"
          multiline={false}
        />
        <TouchableOpacity
          onPress={() => 
            field === 'password' 
              ? setShowPassword(!showPassword)
              : setShowConfirmPassword(!showConfirmPassword)
          }
          style={styles.eyeIcon}
        >
          <Icon
            name={
              field === 'password'
                ? showPassword ? 'eye' : 'eye-off'
                : showConfirmPassword ? 'eye' : 'eye-off'
            }
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>
      {errors[field] && (
        <Text style={styles.errorText}>
          <Icon name="alert-circle" size={12} color="#ef4444" /> {errors[field]}
        </Text>
      )}
    </View>
  );

  // Role Selection Modal Component
  const RoleSelectionModal = () => (
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
          <TouchableOpacity activeOpacity={1}>
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
                      <View style={styles.roleTextContainer}>
                        <Text style={[
                          styles.roleOptionText,
                          formData.role === role._id && styles.roleOptionTextSelected
                        ]}>
                          {role.name}
                        </Text>
                        {role.description && (
                          <Text style={styles.roleDescription}>{role.description}</Text>
                        )}
                      </View>
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
  );

  const RoleSelector = () => (
    <View style={styles.formGroup}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          Select Role<Text style={styles.required}> *</Text>
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.selectorButton, errors.role && styles.inputError]}
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
      {errors.role && (
        <Text style={styles.errorText}>
          <Icon name="alert-circle" size={12} color="#ef4444" /> {errors.role}
        </Text>
      )}
      
      {/* Role Selection Modal */}
      <RoleSelectionModal />
    </View>
  );

  const AdminAccessToggle = () => (
    <View style={styles.formGroup}>
      <View style={styles.toggleContainer}>
        <Text style={styles.label}>Admin Access</Text>
        <Switch
          value={formData.giveAdminAccess}
          onValueChange={value => handleInputChange('giveAdminAccess', value)}
          disabled={submitting}
          trackColor={{ false: '#d1d5db', true: '#10b981' }}
          thumbColor={formData.giveAdminAccess ? '#10b981' : '#f3f4f6'}
        />
      </View>
      <Text style={styles.helperText}>
        {formData.giveAdminAccess
          ? 'Employee has admin privileges'
          : 'Employee has standard privileges'}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
    >
        {/* Personal Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <FormInput
          label="Full Name"
          field="name"
          required
          placeholder="Enter full name"
          editable={!submitting}
        />

        <FormInput
          label="Email Address"
          field="email"
          required
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!submitting}
        />

        <FormInput
          label="Phone Number"
          field="phone"
          required
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          editable={!submitting}
        />
      </View>

      {/* Role & Access Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Role & Access</Text>

        <RoleSelector />

        <FormInput
          label="Department"
          field="department"
          required
          placeholder="e.g., Sales, Support, Administration"
          editable={!submitting}
        />

        <AdminAccessToggle />
      </View>

      {/* Password Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isEditing ? 'Change Password (Optional)' : 'Password'}
        </Text>

        {isEditing && (
          <Text style={styles.helperText}>
            Leave blank to keep current password
          </Text>
        )}

        <PasswordInput
          label="Password"
          field="password"
          required={!isEditing}
        />

        <PasswordInput
          label={isEditing ? 'Confirm New Password' : 'Confirm Password'}
          field="confirmPassword"
          required={!isEditing || !!formData.password}
        />
      </View>

      {/* Address Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address Information</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Street Address</Text>
          <TextInput
            style={styles.input}
            value={formData.address.street}
            onChangeText={value => handleAddressChange('street', value)}
            placeholder="Enter street address"
            placeholderTextColor="#9ca3af"
            editable={!submitting}
            blurOnSubmit={false}
            returnKeyType="default"
            multiline={false}
          />
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.address.city}
              onChangeText={value => handleAddressChange('city', value)}
              placeholder="Enter city"
              placeholderTextColor="#9ca3af"
              editable={!submitting}
              blurOnSubmit={false}
              returnKeyType="default"
              multiline={false}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={formData.address.state}
              onChangeText={value => handleAddressChange('state', value)}
              placeholder="Enter state"
              placeholderTextColor="#9ca3af"
              editable={!submitting}
              blurOnSubmit={false}
              returnKeyType="default"
              multiline={false}
            />
          </View>
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>ZIP Code</Text>
            <TextInput
              style={styles.input}
              value={formData.address.zipCode}
              onChangeText={value => handleAddressChange('zipCode', value)}
              placeholder="Enter ZIP code"
              placeholderTextColor="#9ca3af"
              keyboardType="numbers-and-punctuation"
              editable={!submitting}
              blurOnSubmit={false}
              returnKeyType="default"
              multiline={false}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              value={formData.address.country}
              onChangeText={value => handleAddressChange('country', value)}
              placeholder="Enter country"
              placeholderTextColor="#9ca3af"
              editable={!submitting}
              blurOnSubmit={false}
              returnKeyType="default"
              multiline={false}
            />
          </View>
        </View>
      </View>

      {/* Action Buttons */}
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

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },

  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  formGroup: {
    marginBottom: 16,
  },

  labelContainer: {
    marginBottom: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
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
    padding: 4,
  },

  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
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

  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },

  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  actionSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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

  spacer: {
    height: 20,
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

  roleTextContainer: {
    flex: 1,
  },

  roleOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  roleOptionTextSelected: {
    color: '#3b82f6',
  },

  roleDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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

export default EmployeeForm;
