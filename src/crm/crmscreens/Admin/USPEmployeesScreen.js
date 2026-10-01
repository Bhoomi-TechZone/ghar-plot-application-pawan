import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const USPEmployeesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const modalScrollRef = useRef(null);

  // Main Data States
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [systemEmployees, setSystemEmployees] = useState([]);
  const [enquiries, setEnquiries] = useState([]); // All enquiries from enquiry screen
  const [allUsers, setAllUsers] = useState([]); // All registered users
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('system'); // 'system' or 'manual'
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Track keyboard visibility for smooth modal footer layout
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Form States
  const [formData, setFormData] = useState({
    employeeId: '',
    categoryId: '',
    name: '',
    phone: '',
    expertise: '',
    experienceYears: '',
    description: '',
  });

  // Feedback States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search States for Users/Clients
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Category creation states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Reminder & Schedule States
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [reminderDateObj, setReminderDateObj] = useState(new Date());
  const [reminderTimeObj, setReminderTimeObj] = useState(new Date());
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [showReminderRepeatModal, setShowReminderRepeatModal] = useState(false);
  const [reminderRepeatFrequency, setReminderRepeatFrequency] = useState('none');
  const [customIntervalMinutes, setCustomIntervalMinutes] = useState('');
  const [showCustomIntervalInput, setShowCustomIntervalInput] = useState(false);
  const [showCustomManualInput, setShowCustomManualInput] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

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

  const getReminderRepeatLabel = () => {
    if (reminderRepeatFrequency === 'custom') {
      const mins = customIntervalMinutes;
      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        return rem > 0 ? `Every ${hrs}h ${rem}m` : `Every ${hrs} hour${hrs > 1 ? 's' : ''}`;
      }
      return mins ? `Every ${mins} minute${mins > 1 ? 's' : ''}` : 'Custom';
    }
    const labels = { none: 'Does not repeat', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
    return labels[reminderRepeatFrequency] || 'Does not repeat';
  };

  const handleReminderRepeatSelect = (freq) => {
    setReminderRepeatFrequency(freq);
    if (freq === 'custom') {
      setShowCustomIntervalInput(true);
    } else {
      setShowCustomIntervalInput(false);
      setShowReminderRepeatModal(false);
    }
  };

  const handleCustomIntervalSelect = (minutes) => {
    setCustomIntervalMinutes(minutes);
    setShowCustomIntervalInput(false);
    setShowCustomManualInput(false);
    setShowReminderRepeatModal(false);
  };
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // Statistics
  const [statistics, setStatistics] = useState({
    total: 0,
    systemEmployees: 0,
    manualEmployees: 0,
  });

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Calculate statistics when employees change
  useEffect(() => {
    calculateStatistics();
  }, [employees]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCategories(),
        fetchEmployees(),
        fetchSystemEmployees(),
        fetchEnquiries(), // Fetch all enquiries
        fetchAllUsers(), // Fetch all registered users
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, []);

  // Get auth headers
  const getAuthHeaders = async () => {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const employeeToken = await AsyncStorage.getItem('employeeToken');
    const token = adminToken || employeeToken;

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/api/usp-categories`,
        { headers }
      );
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      CrossPlatformAlert.alert('Error', 'Failed to fetch categories');
    }
  };

  // Create New Category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      CrossPlatformAlert.alert('Error', 'Please enter a category name');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/usp-categories`,
        { name: newCategoryName.trim() },
        { headers }
      );

      if (response.data.success) {
        CrossPlatformAlert.alert('Success', 'Category created successfully!');
        setNewCategoryName('');
        // Refresh categories and auto-select the new one
        await fetchCategories();
        if (response.data.data && response.data.data._id) {
          handleInputChange('categoryId', response.data.data._id);
        }
      }
    } catch (error) {
      console.error('Error creating category:', error);
      CrossPlatformAlert.alert('Error', error.response?.data?.message || 'Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Fetch USP Employees
  const fetchEmployees = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/api/usp-employees`,
        { headers }
      );
      if (response.data.success) {
        setEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      CrossPlatformAlert.alert('Error', 'Failed to fetch employees');
    }
  };

  // Fetch System Employees
  const fetchSystemEmployees = async () => {
    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      const token = adminToken || employeeToken;
      const endpoint = adminToken
        ? `${API_BASE_URL}/admin/employees`
        : `${API_BASE_URL}/api/employees`;

      const response = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setSystemEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching system employees:', error);
    }
  };

  // Fetch All Enquiries
  const fetchEnquiries = async () => {
    try {
      const headers = await getAuthHeaders();

      // Fetch manual enquiries
      const manualResponse = await axios.get(
        `${API_BASE_URL}/api/inquiry/all`,
        { headers }
      );

      // Fetch client enquiries
      const clientResponse = await axios.get(
        `${API_BASE_URL}/api/inquiry/get-enquiries`,
        { headers }
      );

      const manualEnquiries = manualResponse.data?.data || manualResponse.data || [];
      const clientEnquiries = clientResponse.data?.data || clientResponse.data || [];

      // Merge all enquiries and remove duplicates
      const allEnquiries = [...manualEnquiries, ...clientEnquiries];
      const uniqueEnquiries = allEnquiries.reduce((acc, curr) => {
        const key = curr.contactNumber || curr.phone || curr.clientName;
        if (key && !acc.find(e => (e.contactNumber || e.phone) === key)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      setEnquiries(uniqueEnquiries);
      console.log('✅ Loaded', uniqueEnquiries.length, 'enquiries for USP search');
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      // Don't show alert, just log
    }
  };

  // Fetch All Users
  const fetchAllUsers = async () => {
    try {
      const headers = await getAuthHeaders();

      // Fetch all users from the backend
      const response = await axios.get(
        `${API_BASE_URL}/api/users`,
        { headers }
      );

      const users = response.data?.data || response.data?.users || response.data || [];

      // Format users for search
      const formattedUsers = users.map(user => ({
        _id: user._id || user.id,
        fullName: user.fullName || user.name || user.username,
        name: user.fullName || user.name || user.username,
        phone: user.phone || user.mobile || user.contactNumber,
        mobile: user.phone || user.mobile || user.contactNumber,
        contactNumber: user.phone || user.mobile || user.contactNumber,
        email: user.email,
        type: 'user',
        source: 'users-api'
      })).filter(user => user.phone); // Only include users with phone numbers

      setAllUsers(formattedUsers);
      console.log('✅ Loaded', formattedUsers.length, 'users for USP search');
    } catch (error) {
      console.error('Error fetching all users:', error);
      // Don't show alert, just log
    }
  };

  // Search Users/Clients (All Users/Buyers/Sellers/Enquiries)
  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const lowerQuery = query.toLowerCase().trim();

      // Search in all users
      const userMatches = allUsers.filter(user => {
        const name = (user.fullName || user.name || '').toLowerCase();
        const phone = (user.phone || user.mobile || '').toString();
        return name.includes(lowerQuery) || phone.includes(lowerQuery);
      });

      // Search in local enquiries
      const enquiryMatches = enquiries.filter(enquiry => {
        const name = (enquiry.clientName || enquiry.name || '').toLowerCase();
        const phone = (enquiry.contactNumber || enquiry.phone || '').toString();
        return name.includes(lowerQuery) || phone.includes(lowerQuery);
      }).map(enquiry => ({
        _id: enquiry._id || enquiry.id,
        fullName: enquiry.clientName || enquiry.name,
        name: enquiry.clientName || enquiry.name,
        phone: enquiry.contactNumber || enquiry.phone,
        mobile: enquiry.contactNumber || enquiry.phone,
        contactNumber: enquiry.contactNumber || enquiry.phone,
        type: 'enquiry',
        source: 'enquiries'
      }));

      // Merge results and remove duplicates by phone
      const combinedResults = [...userMatches, ...enquiryMatches];
      const uniqueResults = combinedResults.reduce((acc, curr) => {
        const phone = curr.phone || curr.mobile || curr.contactNumber;
        if (phone && !acc.find(r => (r.phone || r.mobile || r.contactNumber) === phone)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      setSearchResults(uniqueResults);
      setShowSearchDropdown(uniqueResults.length > 0);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      setShowSearchDropdown(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle user selection from search
  const handleUserSelect = (user) => {
    setFormData(prev => ({
      ...prev,
      name: user.fullName || user.name || '',
      phone: user.phone || user.mobile || user.contactNumber || '',
    }));
    setSearchQuery(user.fullName || user.name || user.phone || '');
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery && modalType === 'manual' && showModal) {
        searchUsers(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, modalType, showModal]);

  // Calculate Statistics
  const calculateStatistics = () => {
    const total = employees.length;
    const systemCount = employees.filter(emp => emp.employeeType === 'system').length;
    const manualCount = employees.filter(emp => emp.employeeType === 'manual').length;

    setStatistics({
      total,
      systemEmployees: systemCount,
      manualEmployees: manualCount,
    });
  };

  // Filtered Employees
  const filteredEmployees = selectedCategory === 'all'
    ? employees
    : employees.filter(emp => emp.category?._id === selectedCategory);

  // Handle Show Modal
  const handleShowModal = (type = 'system', employee = null) => {
    setModalType(type);

    if (employee) {
      // Edit mode
      setEditingEmployee(employee);
      setFormData({
        employeeId: employee.employee?._id || '',
        categoryId: employee.category?._id || '',
        name: employee.manualName || '',
        phone: employee.manualPhone || '',
        expertise: employee.expertise || '',
        experienceYears: employee.experienceYears?.toString() || '',
        description: employee.description || '',
      });

      // Populate reminder fields
      const hasReminder = !!(employee.scheduledDateTime || employee.isReminderActive);
      setReminderEnabled(hasReminder);
      setReminderTitle(employee.reminderTitle || '');
      setAssignedEmployeeId(employee.assignedEmployee?._id || employee.assignedEmployee || '');
      setReminderRepeatFrequency(employee.repeatType || 'none');
      setCustomIntervalMinutes(employee.customDurationMinutes ? String(employee.customDurationMinutes) : '');
      setShowCustomIntervalInput(employee.repeatType === 'custom');
      setShowCustomManualInput(false);
      setManualMinutes('');

      if (employee.scheduledDateTime) {
        const dt = new Date(employee.scheduledDateTime);
        setReminderDateObj(dt);
        setReminderTimeObj(dt);
      } else {
        const now = new Date();
        const defaultTime = new Date();
        defaultTime.setHours(10, 0, 0, 0);
        setReminderDateObj(now);
        setReminderTimeObj(defaultTime);
      }
    } else {
      // Add mode
      setEditingEmployee(null);
      setFormData({
        employeeId: '',
        categoryId: '',
        name: '',
        phone: '',
        expertise: '',
        experienceYears: '',
        description: '',
      });

      setReminderEnabled(false);
      setReminderTitle('');
      setAssignedEmployeeId('');
      const now = new Date();
      const defaultTime = new Date();
      defaultTime.setHours(10, 0, 0, 0);
      setReminderDateObj(now);
      setReminderTimeObj(defaultTime);
      setShowReminderDatePicker(false);
      setShowReminderTimePicker(false);
      setShowReminderRepeatModal(false);
      setReminderRepeatFrequency('none');
      setCustomIntervalMinutes('');
      setShowCustomIntervalInput(false);
      setShowCustomManualInput(false);
      setManualMinutes('');
    }

    // Reset search state
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setShowEmployeeDropdown(false);

    setShowModal(true);
    setError('');
    setSuccess('');
  };

  // Handle Close Modal
  const handleCloseModal = () => {
    Keyboard.dismiss();
    setShowModal(false);
    setEditingEmployee(null);
    setModalType('system');
    setError('');
    setSuccess('');
    setSubmitting(false);

    // Reset search state
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setShowEmployeeDropdown(false);
  };

  // Handle Input Change
  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validate Form
  const validateForm = () => {
    // Category is required for both system and manual
    if (!formData.categoryId) {
      setError('Please select a category');
      return false;
    }

    if (modalType === 'system') {
      if (!formData.employeeId) {
        setError('Please select an employee');
        return false;
      }
    } else {
      if (!formData.name.trim()) {
        setError('Employee name is required');
        return false;
      }
      if (!formData.phone.trim()) {
        setError('Phone number is required');
        return false;
      }
    }

    return true;
  };

  // Handle Submit
  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();

      // Prepare Reminder Payload if enabled
      let calculatedScheduledDT = null;
      if (reminderEnabled) {
        try {
          const dateOnly = new Date(reminderDateObj);
          const timeOnly = new Date(reminderTimeObj);
          calculatedScheduledDT = new Date(
            dateOnly.getFullYear(),
            dateOnly.getMonth(),
            dateOnly.getDate(),
            timeOnly.getHours(),
            timeOnly.getMinutes(),
            0, 0
          );
        } catch (e) {
          console.warn('Date parse error:', e);
        }
      }

      // Format time for display (HH:MM AM/PM)
      const formatTimeDisplay = (d) => {
        let h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const period = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${period}`;
      };

      const reminderPayload = {
        reminderTitle: reminderEnabled ? (reminderTitle.trim() || `Team USP - ${formData.name || 'Reminder'}`) : '',
        assignedEmployeeId: reminderEnabled && assignedEmployeeId ? assignedEmployeeId : null,
        scheduledDate: reminderEnabled && calculatedScheduledDT ? calculatedScheduledDT.toISOString() : null,
        scheduledTime: reminderEnabled ? formatTimeDisplay(reminderTimeObj) : '',
        scheduledDateTime: reminderEnabled && calculatedScheduledDT ? calculatedScheduledDT.toISOString() : null,
        scheduleType: reminderEnabled ? (reminderRepeatFrequency === 'none' ? 'one_time' : 'recurring') : 'one_time',
        repeatType: reminderEnabled ? reminderRepeatFrequency : 'none',
        customDurationMinutes: reminderEnabled && reminderRepeatFrequency === 'custom' ? (parseInt(customIntervalMinutes, 10) || 15) : 0,
      };

      if (editingEmployee) {
        // Update mode
        const updateData = {
          categoryId: formData.categoryId,
          expertise: formData.expertise,
          experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
          description: formData.description,
          ...reminderPayload,
        };

        if (editingEmployee.employeeType === 'manual') {
          updateData.manualName = formData.name;
          updateData.manualPhone = formData.phone;
        }

        await axios.put(
          `${API_BASE_URL}/api/usp-employees/${editingEmployee._id}`,
          updateData,
          { headers }
        );
        setSuccess('Employee updated successfully!');
      } else {
        // Add mode
        if (modalType === 'system') {
          const data = {
            employeeId: formData.employeeId,
            categoryId: formData.categoryId,
            expertise: formData.expertise,
            experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
            description: formData.description,
            ...reminderPayload,
          };
          await axios.post(
            `${API_BASE_URL}/api/usp-employees/add-by-id`,
            data,
            { headers }
          );
        } else {
          const data = {
            categoryId: formData.categoryId,
            name: formData.name,
            phone: formData.phone,
            expertise: formData.expertise,
            experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
            description: formData.description,
            ...reminderPayload,
          };
          await axios.post(
            `${API_BASE_URL}/api/usp-employees/add-manually`,
            data,
            { headers }
          );
        }
        setSuccess('Employee added to USP successfully!');
      }

      await fetchEmployees();
      setTimeout(() => {
        handleCloseModal();
      }, 1200);
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (employeeId) => {
    CrossPlatformAlert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this employee from USP?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await axios.delete(
                `${API_BASE_URL}/api/usp-employees/${employeeId}`,
                { headers }
              );
              CrossPlatformAlert.alert('Success', 'Employee removed from USP successfully!');
              await fetchEmployees();
            } catch (error) {
              CrossPlatformAlert.alert('Error', error.response?.data?.message || 'Error removing employee');
            }
          },
        },
      ]
    );
  };

  // Render Statistics Card
  const renderStatisticsCard = (title, value, icon, color) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  // Render Employee Card
  const renderEmployeeCard = (employee) => {
    const employeeName = employee.employeeType === 'system'
      ? employee.employee?.name
      : employee.manualName;
    const employeePhone = employee.employeeType === 'system'
      ? employee.employee?.phone
      : employee.manualPhone;

    return (
      <View key={employee._id} style={styles.employeeCard}>
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <View style={styles.employeeNameRow}>
              <Icon name="person" size={20} color="#10b981" />
              <Text style={styles.employeeName}>{employeeName}</Text>
              <View style={[
                styles.typeBadge,
                { backgroundColor: employee.employeeType === 'system' ? '#3b82f6' : '#f59e0b' }
              ]}>
                <Text style={styles.typeBadgeText}>
                  {employee.employeeType === 'system' ? 'System' : 'Manual'}
                </Text>
              </View>
            </View>
            <View style={styles.employeeContactRow}>
              <Icon name="phone" size={14} color="#6b7280" />
              <Text style={styles.employeeContact}>{employeePhone}</Text>
            </View>
          </View>
          <View style={styles.employeeActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleShowModal(employee.employeeType, employee)}
            >
              <Icon name="edit" size={18} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(employee._id)}
            >
              <Icon name="delete" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.employeeDetails}>
          <View style={styles.detailRow}>
            <Icon name="category" size={16} color="#10b981" />
            <Text style={styles.detailLabel}>Category:</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{employee.category?.name}</Text>
            </View>
          </View>

          {employee.expertise && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="briefcase" size={16} color="#10b981" />
              <Text style={styles.detailLabel}>Expertise:</Text>
              <Text style={styles.detailValue}>{employee.expertise}</Text>
            </View>
          )}

          {employee.experienceYears > 0 && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#10b981" />
              <Text style={styles.detailLabel}>Experience:</Text>
              <Text style={styles.detailValue}>{employee.experienceYears} years</Text>
            </View>
          )}

          {employee.description && (
            <View style={styles.descriptionContainer}>
              <Icon name="description" size={16} color="#10b981" />
              <Text style={styles.descriptionText}>{employee.description}</Text>
            </View>
          )}

          {employee.scheduledDateTime && (
            <View style={styles.cardReminderRow}>
              <View style={styles.cardReminderIconBox}>
                <Icon name="alarm" size={16} color="#d97706" />
              </View>
              <View style={styles.cardReminderInfo}>
                <Text style={styles.cardReminderTitle} numberOfLines={1}>
                  {employee.reminderTitle || 'Reminder Scheduled'}
                </Text>
                <Text style={styles.cardReminderTime}>
                  ⏰ {new Date(employee.scheduledDateTime).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })} • 👤 {employee.assignedEmployee?.name ? `To: ${employee.assignedEmployee.name}` : 'Admin only'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Icon name="info" size={16} color="#10b981" />
            <Text style={styles.detailLabel}>Status:</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: employee.isActive ? '#10b981' : '#6b7280' }
            ]}>
              <Text style={styles.statusBadgeText}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading Team's USP...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Team's USP</Text>
            <Text style={styles.headerSubtitle}>
              Manage employees featured in USP categories
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            {renderStatisticsCard('Total Employees', statistics.total, 'people', '#10b981')}
            {renderStatisticsCard('Manual', statistics.manualEmployees, 'person-add', '#f59e0b')}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.addManualButton}
              onPress={() => handleShowModal('manual')}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.gradientButton}
              >
                <Icon name="person-add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Manually</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Filter Section */}
          <View style={styles.filterContainer}>
            <View style={styles.filterHeader}>
              <Icon name="filter-list" size={20} color="#10b981" />
              <Text style={styles.filterTitle}>Filter by Category</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredEmployees.length} Employees</Text>
              </View>
            </View>
            <View style={styles.categoryFilterContainer}>
              <TouchableOpacity
                style={[
                  styles.categoryFilterItem,
                  selectedCategory === 'all' && styles.categoryFilterItemActive
                ]}
                onPress={() => setSelectedCategory('all')}
              >
                <Text style={[
                  styles.categoryFilterText,
                  selectedCategory === 'all' && styles.categoryFilterTextActive
                ]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity
                  key={category._id}
                  style={[
                    styles.categoryFilterItem,
                    selectedCategory === category._id && styles.categoryFilterItemActive
                  ]}
                  onPress={() => setSelectedCategory(category._id)}
                >
                  <Text style={[
                    styles.categoryFilterText,
                    selectedCategory === category._id && styles.categoryFilterTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Employees List */}
          <View style={styles.employeesContainer}>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map(employee => renderEmployeeCard(employee))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="person-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No employees found</Text>
                <Text style={styles.emptyStateText}>
                  Add employees to get started
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Add/Edit Modal */}
        <Modal
          visible={showModal}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalBackdropArea}
              onPress={handleCloseModal}
            />

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingEmployee ? "Edit Team's USP" :
                    modalType === 'system' ? 'Add from System' : 'Add Manually'}
                </Text>
                <TouchableOpacity
                  onPress={handleCloseModal}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Icon name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={modalScrollRef}
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {/* Error/Success Messages */}
                {error ? (
                  <View style={styles.errorAlert}>
                    <Icon name="error" size={20} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {success ? (
                  <View style={styles.successAlert}>
                    <Icon name="check-circle" size={20} color="#10b981" />
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                ) : null}

                {/* Category Dropdown */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Category *</Text>

                  {/* Add New Category */}
                  <View style={styles.addCategoryContainer}>
                    <TextInput
                      style={styles.addCategoryInput}
                      placeholder="Add new category"
                      placeholderTextColor="#9ca3af"
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                    />
                    <TouchableOpacity
                      style={styles.addCategoryButton}
                      onPress={handleCreateCategory}
                      disabled={isCreatingCategory}
                    >
                      <Icon name="add" size={18} color="#fff" />
                      <Text style={styles.addCategoryButtonText}>
                        {isCreatingCategory ? 'Adding...' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Existing Categories */}
                  <View style={styles.pickerContainer}>
                    <Icon name="category" size={20} color="#10b981" />
                    <ScrollView style={styles.picker} nestedScrollEnabled>
                      {categories.length === 0 ? (
                        <Text style={styles.pickerItemText}>No categories available</Text>
                      ) : (
                        categories.map(category => (
                          <TouchableOpacity
                            key={category._id}
                            style={[
                              styles.pickerItem,
                              formData.categoryId === category._id && styles.pickerItemSelected
                            ]}
                            onPress={() => handleInputChange('categoryId', category._id)}
                          >
                            <Text style={[
                              styles.pickerItemText,
                              formData.categoryId === category._id && styles.pickerItemTextSelected
                            ]}>
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                </View>

                {/* System Employee Selection */}
                {modalType === 'system' && !editingEmployee && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Select Employee *</Text>
                    <View style={styles.pickerContainer}>
                      <Icon name="person" size={20} color="#10b981" />
                      <View style={styles.picker}>
                        {systemEmployees.map(emp => (
                          <TouchableOpacity
                            key={emp._id}
                            style={[
                              styles.pickerItem,
                              formData.employeeId === emp._id && styles.pickerItemSelected
                            ]}
                            onPress={() => handleInputChange('employeeId', emp._id)}
                          >
                            <Text style={[
                              styles.pickerItemText,
                              formData.employeeId === emp._id && styles.pickerItemTextSelected
                            ]}>
                              {emp.name} - {emp.email}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* Manual Employee Fields */}
                {(modalType === 'manual' || (editingEmployee && editingEmployee.employeeType === 'manual')) && (
                  <>
                    {/* Search User/Client */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>
                        Search User/Client 🔍
                      </Text>
                      <Text style={styles.helperText}>
                        Search by name or phone - includes all registered users and enquiries
                      </Text>
                      <View style={styles.inputContainer}>
                        <Icon name="search" size={20} color="#10b981" />
                        <TextInput
                          style={styles.input}
                          placeholder="Type name or phone number..."
                          placeholderTextColor="#9ca3af"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          onFocus={() => {
                            if (searchResults.length > 0) {
                              setShowSearchDropdown(true);
                            }
                          }}
                        />
                        {searchLoading && (
                          <ActivityIndicator size="small" color="#10b981" style={styles.searchLoader} />
                        )}
                      </View>

                      {/* Search Results Dropdown */}
                      {showSearchDropdown && searchResults.length > 0 && (
                        <View style={styles.searchDropdown}>
                          <ScrollView style={styles.searchResultsList} nestedScrollEnabled>
                            {searchResults.map((user, index) => (
                              <TouchableOpacity
                                key={user._id || index}
                                style={styles.searchResultItem}
                                onPress={() => handleUserSelect(user)}
                              >
                                <View style={styles.searchResultContent}>
                                  <View style={styles.searchResultIcon}>
                                    <Icon
                                      name={
                                        user.type === 'user' || user.source === 'users-api'
                                          ? "person"
                                          : user.type === 'enquiry' || user.source === 'enquiries'
                                            ? "person-outline"
                                            : user.type === 'buyer' || user.isBuyer
                                              ? "shopping-cart"
                                              : "store"
                                      }
                                      size={20}
                                      color="#10b981"
                                    />
                                  </View>
                                  <View style={styles.searchResultInfo}>
                                    <Text style={styles.searchResultName}>
                                      {user.fullName || user.name || 'Unknown'}
                                    </Text>
                                    <Text style={styles.searchResultPhone}>
                                      📞 {user.phone || user.mobile || user.contactNumber || 'No phone'}
                                    </Text>
                                    <Text style={styles.searchResultType}>
                                      {user.type === 'user' || user.source === 'users-api'
                                        ? '👤 User'
                                        : user.type === 'enquiry' || user.source === 'enquiries'
                                          ? '📋 Enquiry'
                                          : user.type === 'buyer' || user.isBuyer
                                            ? '🛒 Buyer'
                                            : '🏪 Seller'}
                                    </Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {showSearchDropdown && searchResults.length === 0 && !searchLoading && searchQuery.length >= 2 && (
                        <View style={styles.searchDropdown}>
                          <View style={styles.noResultsContainer}>
                            <Icon name="person-off" size={32} color="#9ca3af" />
                            <Text style={styles.noResultsText}>No users found</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Name *</Text>
                      <View style={styles.inputContainer}>
                        <Icon name="person" size={20} color="#10b981" />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter full name"
                          placeholderTextColor="#9ca3af"
                          value={formData.name}
                          onChangeText={(value) => handleInputChange('name', value)}
                        />
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Phone *</Text>
                      <View style={styles.inputContainer}>
                        <Icon name="phone" size={20} color="#10b981" />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter phone number"
                          placeholderTextColor="#9ca3af"
                          value={formData.phone}
                          onChangeText={(value) => handleInputChange('phone', value)}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>
                  </>
                )}

                {/* Expertise */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Expertise</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="briefcase" size={20} color="#10b981" />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Commercial Real Estate"
                      placeholderTextColor="#9ca3af"
                      value={formData.expertise}
                      onChangeText={(value) => handleInputChange('expertise', value)}
                    />
                  </View>
                </View>

                {/* Experience Years */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Years of Experience</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#10b981" />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 5"
                      placeholderTextColor="#9ca3af"
                      value={formData.experienceYears}
                      onChangeText={(value) => handleInputChange('experienceYears', value)}
                      keyboardType="numeric"
                      onFocus={() => {
                        setTimeout(() => {
                          modalScrollRef.current?.scrollToEnd({ animated: true });
                        }, 250);
                      }}
                    />
                  </View>
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description</Text>
                  <View style={styles.textAreaContainer}>
                    <Icon name="description" size={20} color="#10b981" />
                    <TextInput
                      style={styles.textArea}
                      placeholder="Brief description of expertise and achievements"
                      placeholderTextColor="#9ca3af"
                      value={formData.description}
                      onChangeText={(value) => handleInputChange('description', value)}
                      multiline
                      numberOfLines={4}
                      onFocus={() => {
                        setTimeout(() => {
                          modalScrollRef.current?.scrollToEnd({ animated: true });
                        }, 250);
                      }}
                    />
                  </View>
                </View>

                {/* ⏰ Set Reminder Section */}
                <View style={styles.reminderSectionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.reminderToggleCard,
                      reminderEnabled && styles.reminderToggleCardActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setReminderEnabled(!reminderEnabled)}
                  >
                    <View style={styles.reminderToggleLeft}>
                      <View style={[styles.reminderIconBox, reminderEnabled && styles.reminderIconBoxActive]}>
                        <Icon name="alarm" size={22} color={reminderEnabled ? '#fff' : '#10b981'} />
                      </View>
                      <View style={styles.reminderToggleTexts}>
                        <Text style={styles.reminderToggleTitle}>
                          {reminderEnabled ? 'Reminder Scheduled (Active)' : 'Set Reminder / Schedule'}
                        </Text>
                        <Text style={styles.reminderToggleSub}>
                          {reminderEnabled ? 'Admin & Assigned employee will be alerted' : 'Tap to set date, time & repeat'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.checkboxOutline, reminderEnabled && styles.checkboxFilled]}>
                      {reminderEnabled && <Icon name="check" size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>

                  {reminderEnabled && (
                    <View style={styles.reminderFormBody}>
                      {/* Created At info badge */}
                      <View style={styles.createdAtBadge}>
                        <Icon name="history" size={16} color="#6b7280" />
                        <Text style={styles.createdAtText}>
                          {editingEmployee?.createdAt
                            ? `Created: ${new Date(editingEmployee.createdAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}`
                            : `Created: Today, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                        </Text>
                      </View>

                      {/* Reminder Title */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Reminder Title</Text>
                        <View style={styles.inputContainer}>
                          <Icon name="title" size={20} color="#10b981" />
                          <TextInput
                            style={styles.input}
                            placeholder="e.g., Follow up regarding USP discussion"
                            placeholderTextColor="#9ca3af"
                            value={reminderTitle}
                            onChangeText={setReminderTitle}
                          />
                        </View>
                      </View>

                      {/* Assign Reminder to Employee */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Assign Reminder to Employee</Text>
                        <Text style={styles.helperText}>
                          Reminder will go to you (Admin) AND the selected employee
                        </Text>
                        <TouchableOpacity
                          style={styles.selectEmployeeButton}
                          onPress={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                        >
                          <Icon name="person-pin" size={20} color="#10b981" />
                          <Text style={styles.selectEmployeeButtonText} numberOfLines={1}>
                            {assignedEmployeeId
                              ? (systemEmployees.find(e => e._id === assignedEmployeeId)?.name || 'Selected Employee')
                              : '👤 Admin Only (No specific employee)'}
                          </Text>
                          <Icon name={showEmployeeDropdown ? 'expand-less' : 'expand-more'} size={20} color="#6b7280" />
                        </TouchableOpacity>

                        {showEmployeeDropdown && (
                          <View style={styles.employeeDropdownList}>
                            <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                              <TouchableOpacity
                                style={[
                                  styles.employeeDropdownItem,
                                  !assignedEmployeeId && styles.employeeDropdownItemSelected,
                                ]}
                                onPress={() => {
                                  setAssignedEmployeeId('');
                                  setShowEmployeeDropdown(false);
                                }}
                              >
                                <Text style={[
                                  styles.employeeDropdownItemText,
                                  !assignedEmployeeId && styles.employeeDropdownItemTextSelected,
                                ]}>
                                  👤 Admin Only (Don't notify employee)
                                </Text>
                              </TouchableOpacity>
                              {systemEmployees.map(emp => (
                                <TouchableOpacity
                                  key={emp._id}
                                  style={[
                                    styles.employeeDropdownItem,
                                    assignedEmployeeId === emp._id && styles.employeeDropdownItemSelected,
                                  ]}
                                  onPress={() => {
                                    setAssignedEmployeeId(emp._id);
                                    setShowEmployeeDropdown(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.employeeDropdownItemText,
                                    assignedEmployeeId === emp._id && styles.employeeDropdownItemTextSelected,
                                  ]}>
                                    👤 {emp.name} ({emp.phone || emp.email || 'Employee'})
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>

                      {/* Date — exact CreateAlertScreen style */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>
                          Date <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <TouchableOpacity
                          style={styles.dateTimePickerRow}
                          onPress={() => setShowReminderDatePicker(true)}
                        >
                          <Text style={styles.dateTimePickerText}>
                            {(() => {
                              const d = reminderDateObj;
                              return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
                            })()}
                          </Text>
                          <Ionicons name="calendar-outline" size={20} color="#6b7280" style={styles.dateTimePickerIcon} />
                        </TouchableOpacity>
                      </View>

                      {showReminderDatePicker && (
                        <DateTimePicker
                          value={reminderDateObj}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          minimumDate={new Date()}
                          onChange={(event, selectedDate) => {
                            setShowReminderDatePicker(Platform.OS === 'ios');
                            if (selectedDate) setReminderDateObj(selectedDate);
                          }}
                        />
                      )}

                      {/* Time — exact CreateAlertScreen style */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>
                          Time <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <TouchableOpacity
                          style={styles.dateTimePickerRow}
                          onPress={() => setShowReminderTimePicker(true)}
                        >
                          <Text style={styles.dateTimePickerText}>
                            {(() => {
                              const d = reminderTimeObj;
                              let h = d.getHours();
                              const m = String(d.getMinutes()).padStart(2,'0');
                              const ap = h >= 12 ? 'PM' : 'AM';
                              h = h % 12 || 12;
                              return `${String(h).padStart(2,'0')}:${m} ${ap}`;
                            })()}
                          </Text>
                          <Ionicons name="time-outline" size={20} color="#6b7280" style={styles.dateTimePickerIcon} />
                        </TouchableOpacity>
                      </View>

                      {showReminderTimePicker && (
                        <DateTimePicker
                          value={reminderTimeObj}
                          mode="time"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          is24Hour={false}
                          onChange={(event, selectedTime) => {
                            setShowReminderTimePicker(Platform.OS === 'ios');
                            if (selectedTime) setReminderTimeObj(selectedTime);
                          }}
                        />
                      )}

                      {/* Repeat — exact CreateAlertScreen style */}
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Repeat</Text>
                        <TouchableOpacity
                          style={styles.dateTimePickerRow}
                          onPress={() => setShowReminderRepeatModal(true)}
                        >
                          <Text style={styles.dateTimePickerText}>{getReminderRepeatLabel()}</Text>
                          <Ionicons name="chevron-down-outline" size={20} color="#6b7280" style={styles.dateTimePickerIcon} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View
                style={[
                  styles.modalFooter,
                  {
                    paddingBottom: isKeyboardVisible
                      ? 12
                      : (Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16),
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseModal}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.submitGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText} numberOfLines={1}>
                        {editingEmployee ? "Update Team's USP" : 'Add to USP'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Repeat Modal — exact CreateAlertScreen pattern */}
        <Modal
          visible={showReminderRepeatModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReminderRepeatModal(false)}
        >
          <TouchableOpacity
            style={styles.uspRepeatModalOverlay}
            activeOpacity={1}
            onPress={() => !showCustomIntervalInput && setShowReminderRepeatModal(false)}
          >
            <View style={styles.uspRepeatModalContent}>
              <Text style={styles.uspRepeatModalTitle}>Repeat</Text>

              <ScrollView
                style={styles.uspRepeatOptionsScroll}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {[
                  { value: 'none',    label: 'Does not repeat' },
                  { value: 'daily',   label: 'Daily' },
                  { value: 'weekly',  label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly',  label: 'Yearly' },
                  { value: 'custom',  label: 'Custom' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.uspRepeatOption,
                      reminderRepeatFrequency === opt.value && styles.uspRepeatOptionSelected,
                    ]}
                    onPress={() => handleReminderRepeatSelect(opt.value)}
                  >
                    <Text style={[
                      styles.uspRepeatOptionText,
                      reminderRepeatFrequency === opt.value && styles.uspRepeatOptionTextSelected,
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Custom Interval Presets */}
                {showCustomIntervalInput && (
                  <View style={styles.uspCustomIntervalContainer}>
                    <Text style={styles.uspCustomIntervalLabel}>Select interval:</Text>
                    {customIntervalOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.uspCustomOptionItem,
                          customIntervalMinutes === option.value && styles.uspCustomOptionItemSelected,
                        ]}
                        onPress={() => handleCustomIntervalSelect(option.value)}
                      >
                        <Text style={[
                          styles.uspCustomOptionItemText,
                          customIntervalMinutes === option.value && styles.uspCustomOptionItemTextSelected,
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[styles.uspCustomOptionItem, styles.uspAddCustomOption]}
                      onPress={() => setShowCustomManualInput(!showCustomManualInput)}
                    >
                      <Text style={styles.uspAddCustomOptionText}>+ Add Custom</Text>
                    </TouchableOpacity>

                    {showCustomManualInput && (
                      <View style={styles.uspManualInputContainer}>
                        <Text style={styles.uspManualInputLabel}>Enter minutes:</Text>
                        <View style={styles.uspManualInputRow}>
                          <TextInput
                            style={styles.uspManualInput}
                            keyboardType="numeric"
                            value={manualMinutes}
                            onChangeText={(v) => setManualMinutes(v.replace(/[^0-9]/g, ''))}
                            placeholder="e.g. 45"
                            placeholderTextColor="#9ca3af"
                          />
                          <Text style={styles.uspManualInputUnit}>min</Text>
                          <TouchableOpacity
                            style={styles.uspManualConfirmButton}
                            onPress={() => {
                              const mins = parseInt(manualMinutes) || 60;
                              handleCustomIntervalSelect(mins > 0 ? mins : 60);
                            }}
                          >
                            <Text style={styles.uspManualConfirmText}>OK</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {!showCustomIntervalInput && (
                <TouchableOpacity
                  style={styles.uspRepeatModalCloseButton}
                  onPress={() => setShowReminderRepeatModal(false)}
                >
                  <Text style={styles.uspRepeatModalCloseText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginBottom: 12,
  },
  headerContent: {
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addSystemButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addManualButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryFilterItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryFilterItemActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  categoryFilterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryFilterTextActive: {
    color: '#fff',
  },
  employeesContainer: {
    marginBottom: 16,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  employeeContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeContact: {
    fontSize: 13,
    color: '#6b7280',
  },
  employeeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  employeeDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  descriptionContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    flex: 1,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    color: '#10b981',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  textAreaContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
    alignItems: 'flex-start',
  },
  textArea: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 8,
  },
  addCategoryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  addCategoryInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addCategoryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addCategoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  picker: {
    flex: 1,
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  pickerItemSelected: {
    backgroundColor: '#10b981',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#1f2937',
  },
  pickerItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitGradient: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchDropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 200,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  searchResultPhone: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  searchResultType: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  noResultsContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  // Card reminder badge styles
  cardReminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 8,
  },
  cardReminderIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardReminderInfo: {
    flex: 1,
  },
  cardReminderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 2,
  },
  cardReminderTime: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '500',
  },
  // Modal reminder section styles
  reminderSectionContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  reminderToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 14,
  },
  reminderToggleCardActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  reminderToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  reminderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderIconBoxActive: {
    backgroundColor: '#10b981',
  },
  reminderToggleTexts: {
    flex: 1,
  },
  reminderToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  reminderToggleSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  checkboxOutline: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxFilled: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  reminderFormBody: {
    marginTop: 12,
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  createdAtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 14,
    gap: 6,
  },
  createdAtText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  selectEmployeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  selectEmployeeButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  employeeDropdownList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  employeeDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  employeeDropdownItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  employeeDropdownItemText: {
    fontSize: 13,
    color: '#374151',
  },
  employeeDropdownItemTextSelected: {
    color: '#10b981',
    fontWeight: '700',
  },
  quickPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickPresetText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInputBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 8,
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  timeInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    paddingVertical: 4,
    textAlign: 'center',
    width: '100%',
  },
  timeSeparator: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6b7280',
  },
  periodToggleContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  typeChipText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // ── Create-Reminder-matching date/time/repeat picker styles ──
  reminderPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  reminderPickerButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  // Repeat / Reminder-Type Modal (bottom sheet)
  repeatModalOverlay: {
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
    maxHeight: 440,
  },
  repeatModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  repeatSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  repeatOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  repeatOptionRowSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  repeatOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  repeatOptionTextSelected: {
    color: '#065f46',
    fontWeight: '700',
  },
  repeatOptionDesc: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  repeatModalCloseButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  repeatModalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Exact CreateAlertScreen date/time picker row ──
  dateTimePickerRow: {
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
  dateTimePickerText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  dateTimePickerIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  requiredStar: {
    color: '#ef4444',
  },

  // ── Exact CreateAlertScreen repeat modal styles (usp-prefixed) ──
  uspRepeatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  uspRepeatModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  uspRepeatOptionsScroll: {
    maxHeight: 400,
  },
  uspRepeatModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  uspRepeatOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  uspRepeatOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  uspRepeatOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  uspRepeatOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  uspRepeatModalCloseButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  uspRepeatModalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uspCustomIntervalContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  uspCustomIntervalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12,
  },
  uspCustomOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  uspCustomOptionItemSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  uspCustomOptionItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  uspCustomOptionItemTextSelected: {
    color: '#0369a1',
    fontWeight: '600',
  },
  uspAddCustomOption: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    borderStyle: 'dashed',
  },
  uspAddCustomOptionText: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
  },
  uspManualInputContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  uspManualInputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  uspManualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uspManualInput: {
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
  uspManualInputUnit: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  uspManualConfirmButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  uspManualConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default USPEmployeesScreen;
