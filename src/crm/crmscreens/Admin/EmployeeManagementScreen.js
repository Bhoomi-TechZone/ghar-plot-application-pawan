import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  changeEmployeePassword,
  toggleEmployeePopup,
  toggleGiveAdminAccess,
  getSubAdminManagedEmployees,
  assignEmployeesToSubAdmin,
} from '../../services/crmEmployeeManagementApi';
import { getAllRoles } from '../../services/crmRoleApi';
import * as UspService from '../../services/crmUSPApi';
import EmployeeForm from '../../components/EmployeeForm';
import { prepareEmployeeSubmitData } from '../../utils/employeeFormValidation';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const EmployeeManagementScreen = ({ navigation }) => {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [uspCategories, setUspCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Modal states
  const [createEditModalVisible, setCreateEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [uspModalVisible, setUspModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Sub-admin assign employees modal states
  const [assignSubAdminModalVisible, setAssignSubAdminModalVisible] = useState(false);
  const [subAdminTarget, setSubAdminTarget] = useState(null);          // the employee who is sub-admin
  const [selectedManagedIds, setSelectedManagedIds] = useState([]);     // selected employee IDs
  const [assignSubAdminLoading, setAssignSubAdminLoading] = useState(false);
  const [savingSubAdminAssign, setSavingSubAdminAssign] = useState(false);

  // Reminders modal states
  const [remindersModalVisible, setRemindersModalVisible] = useState(false);
  const [employeeReminders, setEmployeeReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [previousReminderCount, setPreviousReminderCount] = useState(0);
  const [pollingActive, setPollingActive] = useState(false);

  // Form states
  const [employeeFormData, setEmployeeFormData] = useState({
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
      country: ''
    }
  });

  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [uspFormData, setUspFormData] = useState({
    categoryId: '',
    expertise: '',
    experienceYears: '',
    description: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Check token validity and redirect if needed
  const checkTokenValidity = useCallback(async () => {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const employeeToken = await AsyncStorage.getItem('employeeToken');

    if (!adminToken && !employeeToken) {
      showAlert('error', 'No authentication token found. Redirecting to login...');
      // Navigate to login screen
      setTimeout(() => navigation.replace('Login'), 2000);
      return false;
    }

    // TODO: Add token expiry check here
    return true;
  }, [navigation]);

  // Get endpoint based on token type
  const isAdmin = useCallback(async () => {
    const adminToken = await AsyncStorage.getItem('adminToken');
    return !!adminToken;
  }, []);

  // Show alert function
  const showAlert = (type, message) => {
    if (type === 'success') {
      CrossPlatformAlert.alert('Success', message);
    } else {
      CrossPlatformAlert.alert('Error', message);
    }
  };

  // Validate employee form
  const validateEmployeeForm = () => {
    const errors = {};

    if (!employeeFormData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!employeeFormData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(employeeFormData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!employeeFormData.phone.trim()) {
      errors.phone = 'Phone is required';
    } else if (!/^\d{10,11}$/.test(employeeFormData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Phone must be 10-11 digits';
    }

    if (!employeeFormData.role) {
      errors.role = 'Role is required';
    }

    if (!selectedEmployee && !employeeFormData.password.trim()) {
      errors.password = 'Password is required for new employees';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate password form
  const validatePasswordForm = () => {
    if (!passwordFormData.newPassword.trim()) {
      showAlert('error', 'New password is required');
      return false;
    }

    if (passwordFormData.newPassword.length < 6) {
      showAlert('error', 'Password must be at least 6 characters');
      return false;
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      showAlert('error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  // Validate USP form
  const validateUspForm = () => {
    if (!uspFormData.categoryId) {
      showAlert('error', 'Please select a USP category');
      return false;
    }
    return true;
  };

  // Load employees
  const loadEmployees = useCallback(async () => {
    if (!(await checkTokenValidity())) return;

    try {
      setLoading(true);
      const response = await getAllEmployees();

      console.log('👥 Loading employees - Response:', JSON.stringify(response, null, 2));

      if (response && response.employees) {
        const processedEmployees = response.employees.map(emp => {
          // Try to get popup enabled from multiple possible field names (backend uses adminReminderPopupEnabled)
          const popupEnabledValue =
            emp.adminReminderPopupEnabled !== undefined ? emp.adminReminderPopupEnabled :
              emp.popupEnabled !== undefined ? emp.popupEnabled :
                emp.adminPopupEnabled !== undefined ? emp.adminPopupEnabled :
                  emp.enablePopupAccess !== undefined ? emp.enablePopupAccess :
                    emp.popupAccessEnabled !== undefined ? emp.popupAccessEnabled :
                      false; // Default to false if not found

          console.log('👤 Processing employee:', emp.name, '- Raw fields:', {
            adminReminderPopupEnabled: emp.adminReminderPopupEnabled,
            popupEnabled: emp.popupEnabled,
            adminPopupEnabled: emp.adminPopupEnabled,
            enablePopupAccess: emp.enablePopupAccess,
            popupAccessEnabled: emp.popupAccessEnabled
          }, '- Final value:', popupEnabledValue);

          return {
            id: emp._id || emp.id,
            name: emp.name || 'Unknown',
            email: emp.email || '',
            phone: emp.phone || '',
            role: emp.role?.name || emp.role || 'Agent',
            roleId: emp.role?._id || emp.role,
            department: emp.department || 'General',
            isActive: emp.isActive !== false,
            joinDate: emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('en-GB') : '',
            giveAdminAccess: emp.giveAdminAccess || false,
            popupEnabled: popupEnabledValue === true || popupEnabledValue === 'true',
            address: emp.address || {}
          };
        });

        console.log('✅ Processed employees:', processedEmployees.map(e => ({ name: e.name, popupEnabled: e.popupEnabled })));
        setEmployees(processedEmployees);
      } else {
        showAlert('error', 'Error fetching employees. Please check your connection and try again.');
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      showAlert('error', 'Error fetching employees. Please check your connection and try again.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [checkTokenValidity]);

  // Load roles
  const loadRoles = useCallback(async () => {
    try {
      const response = await getAllRoles();
      if (response && response.success && response.data) {
        // Filter only active roles
        const activeRoles = response.data.filter(role => role.isActive);
        setRoles(activeRoles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      setRoles([]);
    }
  }, []);

  // Load USP categories
  const loadUspCategories = useCallback(async () => {
    try {
      const response = await UspService.getAllCategories();
      if (response && response.success && response.data) {
        setUspCategories(response.data);
      }
    } catch (error) {
      console.error('Error loading USP categories:', error);
      setUspCategories([]);
    }
  }, []);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadEmployees(), loadRoles()]);
    setRefreshing(false);
  }, [loadEmployees, loadRoles]);

  // Load data on mount
  useEffect(() => {
    loadEmployees();
    loadRoles();
  }, [loadEmployees, loadRoles]);

  // Replaced redundant FCM listeners with global fcmService logic.


  // Open create employee screen
  const openCreateEmployee = () => {
    navigation.navigate('CreateEmployee', {
      isEditing: false,
      employee: null,
      onRefresh: loadEmployees,
    });
  };

  // Open edit employee screen
  const openEditEmployee = (employee) => {
    navigation.navigate('CreateEmployee', {
      isEditing: true,
      employee: employee,
      onRefresh: loadEmployees,
    });
  };

  // Open password modal
  const openPasswordModal = (employee) => {
    setPasswordFormData({
      newPassword: '',
      confirmPassword: ''
    });
    setSelectedEmployee(employee);
    setPasswordModalVisible(true);
  };

  // Open USP modal
  const openUspModal = async (employee) => {
    setUspFormData({
      categoryId: '',
      expertise: '',
      experienceYears: '',
      description: ''
    });
    setSelectedEmployee(employee);

    // Load USP categories if not loaded
    if (uspCategories.length === 0) {
      await loadUspCategories();
    }

    setUspModalVisible(true);
  };
  // Handle employee form submission
  const handleEmployeeSubmit = async (submitData) => {
    try {
      setSubmitting(true);

      if (selectedEmployee) {
        // Update employee
        const response = await updateEmployee(selectedEmployee.id, submitData);
        if (response.success) {
          showAlert('success', 'Employee updated successfully!');
          setTimeout(() => {
            setCreateEditModalVisible(false);
            loadEmployees();
          }, 1500);
        } else {
          showAlert('error', response.message || 'An error occurred while updating employee');
        }
      } else {
        // Create employee
        const response = await createEmployee(submitData);
        if (response.success) {
          showAlert('success', 'Employee created successfully!');
          setTimeout(() => {
            setCreateEditModalVisible(false);
            loadEmployees();
          }, 1500);
        } else {
          showAlert('error', response.message || 'An error occurred while creating employee');
        }
      }
    } catch (error) {
      console.error('Error submitting employee:', error);
      showAlert('error', error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await changeEmployeePassword(selectedEmployee.id, {
        newPassword: passwordFormData.newPassword
      });

      if (response.success) {
        showAlert('success', 'Password updated successfully!');
        setTimeout(() => {
          setPasswordModalVisible(false);
        }, 1500);
      } else {
        showAlert('error', response.message || 'Error updating password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showAlert('error', error.message || 'Error updating password');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle toggle popup
  const handleTogglePopup = async (employee, currentValue) => {
    const newValue = !currentValue;

    try {
      console.log('🔄 Toggle popup handler - Employee:', employee.name, 'Current:', currentValue, 'New:', newValue);

      // Update local state FIRST for instant UI feedback
      setEmployees(prev => {
        const updated = prev.map(e =>
          e.id === employee.id ? { ...e, popupEnabled: newValue } : e
        );
        console.log('✅ Local state updated immediately - New popupEnabled:', newValue);
        return updated;
      });

      // Then call API to save to backend
      console.log('📤 Calling API to save popupEnabled:', newValue);
      const result = await toggleEmployeePopup(employee.id, newValue);

      console.log('📋 Toggle result:', result);

      if (result.success) {
        showAlert('success', `Popup ${newValue ? 'enabled' : 'disabled'} successfully!`);

        // Verify the state was actually saved by re-fetching employee
        console.log('🔍 Verifying backend saved the change...');
        setTimeout(() => {
          loadEmployees(); // Reload to verify from backend
        }, 2000);
      } else {
        // If API failed, revert the local state
        console.error('❌ API failed, reverting local state');
        setEmployees(prev => {
          const reverted = prev.map(e =>
            e.id === employee.id ? { ...e, popupEnabled: currentValue } : e
          );
          console.log('⚠️ Reverted to:', currentValue);
          return reverted;
        });
        showAlert('error', result.message || 'Failed to save popup setting');
      }
    } catch (error) {
      console.error('❌ Error toggling popup:', error);
      // Revert on error
      setEmployees(prev => {
        return prev.map(e =>
          e.id === employee.id ? { ...e, popupEnabled: currentValue } : e
        );
      });
      showAlert('error', error.message || 'Failed to toggle popup');
    }
  };

  // Open the Assign Employees to Sub-Admin modal — fetch data FIRST, then show modal
  const handleOpenSubAdminAssign = async (subAdminEmployee) => {
    setSubAdminTarget(subAdminEmployee);
    setSelectedManagedIds([]);
    setAssignSubAdminLoading(true);
    try {
      const result = await getSubAdminManagedEmployees(subAdminEmployee.id || subAdminEmployee._id);
      if (result.success && result.data) {
        // Convert all IDs to strings to avoid ObjectId vs string mismatch
        const ids = (result.data.managedEmployees || []).map(e => (e._id || e.id)?.toString()).filter(Boolean);
        setSelectedManagedIds(ids);
      }
    } catch (e) {
      console.error('Failed to load managed employees:', e);
    } finally {
      setAssignSubAdminLoading(false);
      // Open modal AFTER data is ready — prevents empty flash + double-open animation
      setAssignSubAdminModalVisible(true);
    }
  };

  // Toggle selection of an employee in the sub-admin assign modal
  const toggleSubAdminEmployee = (empId) => {
    const empIdStr = empId?.toString();
    setSelectedManagedIds(prev =>
      prev.map(id => id?.toString()).includes(empIdStr)
        ? prev.filter(id => id?.toString() !== empIdStr)
        : [...prev, empIdStr]
    );
  };

  // Save the sub-admin employee assignment
  const handleSaveSubAdminAssign = async () => {
    if (!subAdminTarget) return;
    try {
      setSavingSubAdminAssign(true);
      // Send selectedManagedIds (empty array is allowed to clear all)
      const idsToSend = selectedManagedIds.map(id => (id?._id || id?.id || id)?.toString()).filter(Boolean);
      const result = await assignEmployeesToSubAdmin(subAdminTarget.id || subAdminTarget._id, idsToSend);
      if (result.success) {
        const msg = idsToSend.length === 0
          ? `All employees removed from ${subAdminTarget.name}`
          : `${idsToSend.length} employee(s) assigned to ${subAdminTarget.name} successfully!`;
        showAlert('success', msg);
        setAssignSubAdminModalVisible(false);
        loadEmployees();
      } else {
        showAlert('error', result.message || 'Failed to assign employees');
      }
    } catch (e) {
      showAlert('error', e.message || 'Network error');
    } finally {
      setSavingSubAdminAssign(false);
    }
  };

  // Handle toggle admin access
  const handleToggleAdminAccess = async (employee, currentValue) => {
    const newValue = !currentValue;

    try {
      console.log('🔐 Toggle admin access - Employee:', employee.name, 'Current:', currentValue, 'New:', newValue);

      // Update local state FIRST for instant UI feedback
      setEmployees(prev => {
        const updated = prev.map(e =>
          e.id === employee.id ? { ...e, giveAdminAccess: newValue } : e
        );
        return updated;
      });

      // Call API to save to backend
      console.log('📤 Calling API to save giveAdminAccess:', newValue);
      const result = await toggleGiveAdminAccess(employee.id, newValue);

      console.log('📋 Toggle admin access result:', result);

      if (result.success) {
        showAlert('success', `Admin access ${newValue ? 'enabled' : 'disabled'} for ${employee.name}!`);

        // Reload to verify from backend
        setTimeout(() => {
          loadEmployees();
        }, 2000);
      } else {
        // If API failed, revert the local state
        console.error('❌ API failed, reverting local state');
        setEmployees(prev => {
          return prev.map(e =>
            e.id === employee.id ? { ...e, giveAdminAccess: currentValue } : e
          );
        });
        showAlert('error', result.message || 'Failed to update admin access');
      }
    } catch (error) {
      console.error('❌ Error toggling admin access:', error);
      // Revert on error
      setEmployees(prev => {
        return prev.map(e =>
          e.id === employee.id ? { ...e, giveAdminAccess: currentValue } : e
        );
      });
      showAlert('error', error.message || 'Failed to toggle admin access');
    }
  };

  // Handle USP submission
  const handleUspSubmit = async () => {
    if (!validateUspForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const submitData = {
        employeeId: selectedEmployee.id,
        categoryId: uspFormData.categoryId,
        expertise: uspFormData.expertise,
        experienceYears: uspFormData.experienceYears ? parseInt(uspFormData.experienceYears) : undefined,
        description: uspFormData.description
      };

      const response = await UspService.addEmployeeById(submitData);

      if (response.success) {
        showAlert('success', 'Employee added to USP successfully!');
        setTimeout(() => {
          setUspModalVisible(false);
        }, 1500);
      } else {
        showAlert('error', response.message || 'Error adding employee to USP');
      }
    } catch (error) {
      console.error('Error adding employee to USP:', error);
      showAlert('error', error.message || 'Error adding employee to USP');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete employee
  const handleDeleteEmployee = (employee) => {
    CrossPlatformAlert.alert(
      'Delete Employee',
      'Are you sure you want to delete this employee?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteEmployee(employee.id);
              if (response.success) {
                showAlert('success', 'Employee deleted successfully!');
                loadEmployees();
              } else {
                showAlert('error', response.message || 'Error deleting employee');
              }
            } catch (error) {
              console.error('Error deleting employee:', error);
              showAlert('error', error.message || 'Error deleting employee');
            }
          },
        },
      ]
    );
  };

  // Load reminders for employee
  const loadEmployeeReminders = async (employeeId) => {
    try {
      setRemindersLoading(true);

      const token = await AsyncStorage.getItem('adminToken') ||
        await AsyncStorage.getItem('crm_auth_token') ||
        await AsyncStorage.getItem('employee_auth_token');

      if (!token) {
        CrossPlatformAlert.alert('Error', 'No authentication token found');
        return;
      }

      const response = await fetch(
        `https://gharplotbackend.gntechnology.de/api/reminder/employee/${employeeId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch reminders: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setEmployeeReminders(data.data);
        setPreviousReminderCount(data.data.length); // Set initial count
        console.log('✅ Reminders loaded:', data.data.length);
      } else {
        setEmployeeReminders([]);
        setPreviousReminderCount(0);
      }
    } catch (error) {
      console.error('❌ Load reminders error:', error);
      setEmployeeReminders([]);
      setPreviousReminderCount(0);
    } finally {
      setRemindersLoading(false);
    }
  };

  // Handle view reminders
  const handleViewReminders = async (employee) => {
    setSelectedEmployee(employee);
    console.log('📱 Opening reminders for:', employee.name);
    // Load reminders first
    await loadEmployeeReminders(employee._id || employee.id);
    // Then open modal - this will trigger polling via useEffect
    setRemindersModalVisible(true);
  };

  // Polling for new reminders - only notify when count increases
  useEffect(() => {
    if (!pollingActive || !selectedEmployee) {
      console.log('❌ Polling not active or no employee selected. Active:', pollingActive, 'Employee:', selectedEmployee?.name);
      return;
    }

    console.log('✅ Polling STARTED for:', selectedEmployee.name, 'Current reminders count:', previousReminderCount);

    const pollInterval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('adminToken') ||
          await AsyncStorage.getItem('crm_auth_token') ||
          await AsyncStorage.getItem('employee_auth_token');

        if (!token) {
          console.log('❌ No token found');
          return;
        }

        const response = await fetch(
          `https://gharplotbackend.gntechnology.de/api/reminder/employee/${selectedEmployee._id || selectedEmployee.id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          console.log('❌ API response not ok:', response.status);
          return;
        }

        const data = await response.json();

        if (data.success && data.data) {
          const newReminders = data.data;
          const newCount = newReminders.length;

          console.log('📊 API returned:', newCount, 'reminders. Previous count was:', previousReminderCount);

          // Check if new reminder was added (count increased)
          if (newCount > previousReminderCount) {
            console.log('🎯 Count increased! Old:', previousReminderCount, 'New:', newCount);

            // Find the newly added reminder
            const newReminder = newReminders.find(r =>
              !employeeReminders.some(er => er._id === r._id)
            ) || newReminders[0];

            console.log('🔔 NEW REMINDER DETECTED!', newReminder.title);

            // Show notification immediately with employee name
            CrossPlatformAlert.alert(
              `🔔 New Reminder Set - ${selectedEmployee?.name}`,
              `Reminder: ${newReminder.title}\nClient: ${newReminder.clientName}\n\n⏰ ${new Date(newReminder.reminderDateTime).toLocaleString()}`,
              [
                { text: 'OK', style: 'default' }
              ]
            );

            // Tell backend to schedule notification at reminder time (NOT using setTimeout)
            try {
              const token = await AsyncStorage.getItem('adminToken') ||
                await AsyncStorage.getItem('crm_auth_token') ||
                await AsyncStorage.getItem('employee_auth_token');

              // Call backend to schedule FCM notification at reminder time
              const scheduleResponse = await fetch(
                'https://gharplotbackend.gntechnology.de/api/reminder/schedule-notification',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    reminderId: newReminder._id,
                    scheduledTime: newReminder.reminderDateTime,
                    title: `⏰ Reminder Time - ${selectedEmployee?.name}`,
                    message: `Time to follow up!\n\n${newReminder.title}\nClient: ${newReminder.clientName}`,
                  })
                }
              );

              if (scheduleResponse.ok) {
                console.log('✅ Scheduled notification on backend for:', new Date(newReminder.reminderDateTime).toLocaleString());
              } else {
                console.log('⚠️ Backend notification scheduling failed');
              }
            } catch (error) {
              console.error('❌ Error scheduling backend notification:', error);
            }

            // Update reminders list silently (no loading spinner)
            setEmployeeReminders(newReminders);
            // Update count
            setPreviousReminderCount(newCount);
            console.log('✅ Reminders updated, new count:', newCount);
          }
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds for quick detection

    return () => {
      console.log('🛑 Polling STOPPED for:', selectedEmployee?.name);
      clearInterval(pollInterval);
    };
  }, [pollingActive, selectedEmployee, selectedEmployee?.name]);

  // Handle modal open/close
  useEffect(() => {
    if (!remindersModalVisible) {
      setPollingActive(false);
      setPreviousReminderCount(0);
      setSelectedEmployee(null);
    } else {
      setPollingActive(true);
    }
  }, [remindersModalVisible]);

  // Filter employees based on search
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchText.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchText.toLowerCase()) ||
    employee.phone.includes(searchText) ||
    employee.role.toLowerCase().includes(searchText.toLowerCase())
  );

  // Render employee item
  const renderEmployeeItem = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </Text>
          </View>
        </View>

        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.employeeEmail} numberOfLines={1}>{item.email}</Text>
          <Text style={styles.employeePhone} numberOfLines={1}>{item.phone}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#10b981' : '#ef4444', flexShrink: 0 }]}>
          <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{item.role}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{item.department}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Join Date</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{item.joinDate}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Admin Access</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{item.giveAdminAccess ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      </View>

      {/* Give Admin Access Toggle Row */}
      <View style={styles.popupAccessRow}>
        <View style={styles.popupAccessLeft}>
          <Icon name="shield-checkmark" size={20} color="#10b981" />
          <Text style={styles.popupAccessText}>Give Admin Access</Text>
        </View>
        <Switch
          value={item.giveAdminAccess || false}
          onValueChange={() => handleToggleAdminAccess(item, item.giveAdminAccess)}
          trackColor={{ false: '#e5e7eb', true: '#10b981' }}
          thumbColor={item.giveAdminAccess ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      {/* Assign Employees to Sub-Admin (only shown when admin access is ON) */}
      {item.giveAdminAccess && (
        <TouchableOpacity
          style={styles.assignSubAdminRow}
          onPress={() => handleOpenSubAdminAssign(item)}
        >
          <View style={styles.popupAccessLeft}>
            <Icon name="people" size={20} color="#7c3aed" />
            <View>
              <Text style={[styles.popupAccessText, { color: '#7c3aed' }]}>Assign Employees to Sub-Admin</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginLeft: 0 }}>Select which employees this sub-admin monitors</Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={18} color="#7c3aed" />
        </TouchableOpacity>
      )}

      {/* Enable Popup Access Row */}
      <View style={styles.popupAccessRow}>
        <View style={styles.popupAccessLeft}>
          <Icon name="notifications" size={20} color="#f59e0b" />
          <Text style={styles.popupAccessText}>Enable Popup Access</Text>
        </View>
        <Switch
          value={item.popupEnabled}
          onValueChange={() => handleTogglePopup(item, item.popupEnabled)}
          trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
          thumbColor={item.popupEnabled ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      <ScrollView
        style={styles.cardActionsContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewReminders(item)}
          >
            <Icon name="list" size={16} color="#3b82f6" />
            <Text style={styles.actionText}>Reminders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditEmployee(item)}
          >
            <Icon name="create" size={16} color="#3b82f6" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openUspModal(item)}
          >
            <Icon name="star" size={16} color="#f59e0b" />
            <Text style={styles.actionText}>USP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteEmployee(item)}
          >
            <Icon name="trash" size={16} color="#ef4444" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  // Assign Employees to Sub-Admin Modal 
  const renderAssignSubAdminModal = () => {
    // Get employees that are NOT the sub-admin themselves
    const availableEmployees = employees.filter(e => e.id !== subAdminTarget?.id);
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={assignSubAdminModalVisible}
        onRequestClose={() => setAssignSubAdminModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%', maxHeight: '85%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Assign Employees to Sub-Admin</Text>
                {subAdminTarget && (
                  <Text style={{ fontSize: 13, color: '#7c3aed', marginTop: 2 }}>
                    Sub-Admin: {subAdminTarget.name}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setAssignSubAdminModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, flex: 1 }}>
              {/* Info banner */}
              <View style={{ backgroundColor: '#f3f0ff', padding: 10, borderRadius: 8, marginBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="information-circle" size={18} color="#7c3aed" />
                <Text style={{ fontSize: 12, color: '#6d28d9', flex: 1, lineHeight: 18 }}>
                  Selected employees ki notifications aur reminders ye sub-admin monitor kar sakta hai.
                </Text>
              </View>

              {availableEmployees.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No other employees available</Text>
              ) : (
                <FlatList
                  data={availableEmployees}
                  keyExtractor={(emp) => String(emp.id || emp._id)}
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1 }}
                  renderItem={({ item: emp }) => {
                    const isSelected = selectedManagedIds.map(id => id?.toString()).includes((emp.id || emp._id)?.toString());
                    return (
                      <TouchableOpacity
                        style={[
                          styles.subAdminEmpItem,
                          isSelected && styles.subAdminEmpItemSelected,
                        ]}
                        onPress={() => toggleSubAdminEmployee(emp.id)}
                      >
                        <View style={[styles.subAdminEmpAvatar, { backgroundColor: isSelected ? '#7c3aed' : '#e5e7eb' }]}>
                          <Text style={{ color: isSelected ? '#fff' : '#374151', fontWeight: '700', fontSize: 14 }}>
                            {emp.name ? emp.name[0].toUpperCase() : '?'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.subAdminEmpName, isSelected && { color: '#7c3aed' }]}>{emp.name}</Text>
                          <Text style={styles.subAdminEmpRole}>{emp.role} {emp.department ? `• ${emp.department}` : ''}</Text>
                          <Text style={{ fontSize: 11, color: emp.isActive ? '#10b981' : '#ef4444' }}>
                            {emp.isActive ? '● Active' : '● Inactive'}
                          </Text>
                        </View>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Icon name="checkmark" size={14} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>

            {/* Footer */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 10 }}>
                {selectedManagedIds.length} employee(s) selected
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, backgroundColor: '#f3f4f6' }]}
                  onPress={() => setAssignSubAdminModalVisible(false)}
                  disabled={savingSubAdminAssign}
                >
                  <Text style={[styles.submitButtonText, { color: '#374151' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 2, backgroundColor: '#7c3aed' }]}
                  onPress={handleSaveSubAdminAssign}
                  disabled={savingSubAdminAssign}
                >
                  {savingSubAdminAssign ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Assignment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Password Change Modal
  const renderPasswordModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={passwordModalVisible}
      onRequestClose={() => setPasswordModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity
              onPress={() => setPasswordModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalDescription}>
              Change password for {selectedEmployee?.name}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>New Password *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter new password"
                value={passwordFormData.newPassword}
                onChangeText={(text) => setPasswordFormData(prev => ({ ...prev, newPassword: text }))}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Confirm Password *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Confirm new password"
                value={passwordFormData.confirmPassword}
                onChangeText={(text) => setPasswordFormData(prev => ({ ...prev, confirmPassword: text }))}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.modalActionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPasswordModalVisible(false)}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!passwordFormData.newPassword.trim() || !passwordFormData.confirmPassword.trim() || submitting) && styles.submitButtonDisabled
              ]}
              onPress={handlePasswordSubmit}
              disabled={!passwordFormData.newPassword.trim() || !passwordFormData.confirmPassword.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // USP Modal
  const renderUspModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={uspModalVisible}
      onRequestClose={() => setUspModalVisible(false)}
    >
      <View style={styles.uspModalOverlay}>
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', flexDirection: 'column', width: '100%' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to USP</Text>
            <TouchableOpacity
              onPress={() => setUspModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.modalBody, { flex: 1 }]}>
            <View style={styles.infoAlert}>
              <Icon name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.infoAlertText}>
                Add {selectedEmployee?.name} to USP (Unique Selling Proposition) to showcase their expertise.
              </Text>
            </View>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>USP Category *</Text>
              <View style={styles.formInput}>
                <TouchableOpacity
                  style={styles.roleSelector}
                  onPress={() => {
                    if (uspCategories.length === 0) {
                      showAlert('error', 'No USP categories available. Please create categories first.');
                      return;
                    }

                    CrossPlatformAlert.alert(
                      'Select USP Category',
                      '',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        ...uspCategories.map(category => ({
                          text: category.name,
                          onPress: () => {
                            setUspFormData(prev => ({ ...prev, categoryId: category._id }));
                          }
                        }))
                      ]
                    );
                  }}
                >
                  <Text style={[styles.roleSelectorText, !uspFormData.categoryId && { color: '#9ca3af' }]}>
                    {uspFormData.categoryId
                      ? uspCategories.find(c => c._id === uspFormData.categoryId)?.name || 'Select Category'
                      : 'Select Category'
                    }
                  </Text>
                  <Icon name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Expertise */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Expertise</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Residential Properties, Commercial Real Estate"
                value={uspFormData.expertise}
                onChangeText={(text) => setUspFormData(prev => ({ ...prev, expertise: text }))}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Experience Years */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Experience Years</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter years of experience"
                value={uspFormData.experienceYears}
                onChangeText={(text) => setUspFormData(prev => ({ ...prev, experienceYears: text }))}
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, { height: 80 }]}
                placeholder="Describe their specialization and achievements..."
                value={uspFormData.description}
                onChangeText={(text) => setUspFormData(prev => ({ ...prev, description: text }))}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setUspModalVisible(false)}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!uspFormData.categoryId || submitting) && styles.submitButtonDisabled
              ]}
              onPress={handleUspSubmit}
              disabled={!uspFormData.categoryId || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Add to USP</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderRemindersModal = () => (
    <Modal
      visible={remindersModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setRemindersModalVisible(false)}
    >
      <SafeAreaView style={styles.reminderModalContainer}>
        <View style={styles.reminderModalContent}>
          {/* Modal Header */}
          <View style={styles.reminderModalHeader}>
            <View style={styles.reminderHeaderLeft}>
              <Icon name="alarm-multiple" size={28} color="#3b82f6" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.reminderModalTitle}>{selectedEmployee?.name}</Text>
                <Text style={styles.reminderModalSubtitle}>
                  {employeeReminders?.length || 0} reminders set
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.reminderCloseButton}
              onPress={() => setRemindersModalVisible(false)}
            >
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          {remindersLoading && employeeReminders.length === 0 ? (
            <View style={styles.reminderLoadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading reminders...</Text>
            </View>
          ) : employeeReminders && employeeReminders.length > 0 ? (
            <ScrollView style={styles.remindersListContainer}>
              {employeeReminders.map((reminder, index) => {
                const reminderDate = new Date(reminder.reminderDateTime);
                const isOverdue = new Date() > reminderDate;

                return (
                  <View key={reminder._id || index} style={[styles.reminderCard, isOverdue && styles.overdueCard]}>
                    <View style={styles.reminderCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reminderTitle}>{reminder.title}</Text>
                        <Text style={styles.reminderClient}>{reminder.clientName}</Text>
                      </View>
                      <View style={[styles.reminderBadge, { backgroundColor: isOverdue ? '#fed7d7' : '#dbeafe' }]}>
                        <Text style={[styles.reminderBadgeText, { color: isOverdue ? '#991b1b' : '#1e40af' }]}>
                          {isOverdue ? 'OVERDUE' : 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.reminderDetails}>
                      <View style={styles.detailRow}>
                        <Icon name="call" size={14} color="#6b7280" />
                        <Text style={styles.detailText}>{reminder.phone}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Icon name="mail" size={14} color="#6b7280" />
                        <Text style={styles.detailText} numberOfLines={1}>{reminder.email}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Icon name="calendar" size={14} color="#6b7280" />
                        <Text style={styles.detailText}>
                          {reminderDate.toLocaleDateString()} at {reminderDate.toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.reminderStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Triggered</Text>
                        <Text style={styles.statValue}>{reminder.triggerCount || 0}x</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Snoozed</Text>
                        <Text style={styles.statValue}>{reminder.snoozeCount || 0}x</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Status</Text>
                        <Text style={styles.statValue}>{reminder.status}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyRemindersContainer}>
              <Icon name="inbox" size={64} color="#d1d5db" />
              <Text style={styles.emptyRemindersTitle}>No Reminders</Text>
              <Text style={styles.emptyRemindersText}>
                {selectedEmployee?.name} hasn't set any reminders yet
              </Text>
            </View>
          )}

          {/* Modal Footer */}
          <TouchableOpacity
            style={styles.reminderCloseFooterButton}
            onPress={() => setRemindersModalVisible(false)}
          >
            <Text style={styles.reminderCloseFooterButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1e293b"
        translucent={false}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateEmployee}
        >
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{employees.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>
              {employees.filter(emp => emp.isActive).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#ef4444' }]}>
              {employees.filter(emp => !emp.isActive).length}
            </Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="people" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {searchText ? 'No employees found' : 'No employees found'}
            </Text>
            <Text style={styles.emptySubText}>
              {searchText
                ? 'Try adjusting your search criteria'
                : 'Create your first employee!'
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployeeItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
              />
            }
          />
        )}
      </View>

      {renderAssignSubAdminModal()}
      {renderPasswordModal()}
      {renderUspModal()}
      {renderRemindersModal()}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  listContainer: {
    paddingBottom: 20,
  },
  employeeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  employeeInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 1,
  },
  employeePhone: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  infoItem: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 3,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  popupAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  popupAccessLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  popupAccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    marginLeft: 8,
  },
  assignSubAdminRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f0ff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  subAdminEmpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  subAdminEmpItemSelected: {
    backgroundColor: '#f3f0ff',
    borderColor: '#7c3aed',
  },
  subAdminEmpAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subAdminEmpName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  subAdminEmpRole: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  cardActionsContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 90,
    justifyContent: 'center',
    flexShrink: 0,
    gap: 4,
  },
  editButton: {
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
  },
  passwordButton: {
    borderColor: '#fef3c7',
    backgroundColor: '#fffbeb',
  },
  uspButton: {
    borderColor: '#fef3c7',
    backgroundColor: '#fffbeb',
  },
  deleteButton: {
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    flexDirection: 'column',
  },
  uspModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    flex: 1,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 12,
  },
  // Form styles
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formSubLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: -4,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  formInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  roleSelectorText: {
    fontSize: 16,
    color: '#374151',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoAlert: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoAlertText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
    flex: 1,
  },
  // Modal action buttons (fixed at bottom)
  modalActionButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Reminders Modal Styles
  reminderModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  reminderModalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  reminderModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  reminderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  reminderModalSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  reminderCloseButton: {
    padding: 8,
  },
  reminderLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remindersListContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  reminderCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  overdueCard: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ef4444',
  },
  reminderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  reminderClient: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  reminderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reminderBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reminderDetails: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  reminderStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  emptyRemindersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyRemindersTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyRemindersText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  reminderCloseFooterButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reminderCloseFooterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EmployeeManagementScreen;
