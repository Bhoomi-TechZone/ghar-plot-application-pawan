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

// Helper: Format Note Date safely without Hermes invalid date issues
const formatNoteDate = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string' && (dateVal.includes('AM') || dateVal.includes('PM') || isNaN(Date.parse(dateVal)))) {
    return dateVal;
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return String(dateVal);
  }
};

// Helper: Parse description and notes history uniformly from either descriptionHistory array or concatenated description string
const parseDescriptionHistory = (employee) => {
  if (!employee) return [];

  // 1. If descriptionHistory array exists and has items
  if (Array.isArray(employee.descriptionHistory) && employee.descriptionHistory.length > 0) {
    return employee.descriptionHistory
      .filter(item => item && (typeof item === 'object' || typeof item === 'string'))
      .map((item, idx) => {
        const rawText = typeof item === 'string' ? item : (item.text || '');
        const cleanText = rawText.replace(/^\[(?:Added|Update)[^\]]+\]:\s*/i, '').trim();
        return {
          text: cleanText || rawText.trim(),
          addedAt: item.addedAt || (idx === 0 ? employee.createdAt : employee.updatedAt) || employee.createdAt,
          addedBy: item.addedBy || 'Admin',
        };
      })
      .filter(item => item.text && item.text.length > 0);
  }

  // 2. If description is a string
  if (employee.description && typeof employee.description === 'string' && employee.description.trim().length > 0) {
    const raw = employee.description.trim();
    // Split by double newlines
    const parts = raw.split(/\n\s*\n/).filter(p => p && p.trim().length > 0);
    if (parts.length > 0) {
      return parts.map((part, idx) => {
        const match = part.match(/^\[(?:Added|Update)\s*([^\]]+)\]:\s*([\s\S]*)$/i);
        if (match) {
          return {
            text: match[2].trim(),
            addedAt: match[1].trim(),
            addedBy: 'Admin',
          };
        }
        return {
          text: part.replace(/^\[(?:Added|Update)[^\]]+\]:\s*/i, '').trim(),
          addedAt: idx === parts.length - 1 ? (employee.updatedAt || employee.createdAt) : employee.createdAt,
          addedBy: 'Admin',
        };
      }).filter(item => item.text && item.text.length > 0);
    }
  }

  return [];
};

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

  // New Description & Details Modal States
  const [newDescription, setNewDescription] = useState('');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const handleOpenDetails = (employee) => {
    setSelectedEmployeeDetails(employee);
    setDetailsModalVisible(true);
  };

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminToken = (await AsyncStorage.getItem('adminToken')) || (await AsyncStorage.getItem('admin_token'));
        const userType = (await AsyncStorage.getItem('userType')) || (await AsyncStorage.getItem('user_type'));
        const userRole = (await AsyncStorage.getItem('userRole')) || (await AsyncStorage.getItem('user_role'));
        const role = await AsyncStorage.getItem('role');

        const isUserAdmin = !!adminToken || userType === 'admin' || userRole === 'admin' || role === 'admin';
        setIsAdmin(isUserAdmin);
      } catch (e) {
        console.error('Error checking admin status:', e);
      }
    };
    checkAdmin();
  }, []);

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
      setNewDescription('');
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
      setNewDescription('');
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
    setNewDescription('');
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
        assignedEmployeeId: assignedEmployeeId ? assignedEmployeeId : null,
        scheduledDate: reminderEnabled && calculatedScheduledDT ? calculatedScheduledDT.toISOString() : null,
        scheduledTime: reminderEnabled ? formatTimeDisplay(reminderTimeObj) : '',
        scheduledDateTime: reminderEnabled && calculatedScheduledDT ? calculatedScheduledDT.toISOString() : null,
        scheduleType: reminderEnabled ? (reminderRepeatFrequency === 'none' ? 'one_time' : 'recurring') : 'one_time',
        repeatType: reminderEnabled ? reminderRepeatFrequency : 'none',
        customDurationMinutes: reminderEnabled && reminderRepeatFrequency === 'custom' ? (parseInt(customIntervalMinutes, 10) || 15) : 0,
      };

      if (editingEmployee) {
        // Update mode: previous descriptions are preserved; only new description is appended
        const updateData = {
          categoryId: formData.categoryId,
          expertise: formData.expertise,
          experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
          newDescription: newDescription.trim(),
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

  // Handle Delete All (Admin only)
  const handleDeleteAll = () => {
    if (!employees || employees.length === 0) {
      CrossPlatformAlert.alert('Info', 'No employees to delete in Team USP.');
      return;
    }

    CrossPlatformAlert.alert(
      'Delete All Employees',
      `Are you sure you want to remove ALL ${employees.length} employees from Team's USP?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const headers = await getAuthHeaders();
              const response = await axios.delete(
                `${API_BASE_URL}/api/usp-employees/delete-all`,
                { headers }
              );
              if (response.data && response.data.success) {
                CrossPlatformAlert.alert('Success', 'All Team USP employees have been removed successfully.');
                await fetchEmployees();
              } else {
                CrossPlatformAlert.alert('Error', response.data?.message || 'Failed to delete all employees');
              }
            } catch (error) {
              console.error('Error deleting all USP employees:', error);
              CrossPlatformAlert.alert('Error', error.response?.data?.message || 'Failed to delete all employees');
            } finally {
              setLoading(false);
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
      <TouchableOpacity
        key={employee._id}
        style={styles.employeeCard}
        activeOpacity={0.88}
        onPress={() => handleOpenDetails(employee)}
      >
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <View style={styles.employeeNameRow}>
              <Icon name="person" size={20} color="#10b981" />
              <Text style={styles.employeeName}>{employeeName}</Text>
            </View>
            <View style={styles.employeeContactRow}>
              <Icon name="phone" size={14} color="#6b7280" />
              <Text style={styles.employeeContact}>{employeePhone}</Text>
            </View>
          </View>
          <View style={[
            styles.typeBadge,
            { backgroundColor: employee.employeeType === 'system' ? '#3b82f6' : '#f59e0b' }
          ]}>
            <Text style={styles.typeBadgeText}>
              {employee.employeeType === 'system' ? 'System' : 'Manual'}
            </Text>
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

          {(() => {
            const notes = parseDescriptionHistory(employee);
            if (!notes || notes.length === 0) return null;
            const latestNote = notes[notes.length - 1];
            const hasMultiple = notes.length > 1;

            return (
              <View style={styles.descriptionContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="comment" size={13} color="#059669" style={{ marginRight: 5 }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#065f46', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {hasMultiple ? `Latest Note (#${notes.length})` : 'Description / Note'}
                    </Text>
                  </View>
                  {hasMultiple ? (
                    <View style={{ backgroundColor: '#d1fae5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#047857' }}>
                        {notes.length} notes (Tap card)
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.descriptionText} numberOfLines={3}>
                  {latestNote.text}
                </Text>

                {latestNote.addedAt ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Icon name="access-time" size={11} color="#059669" />
                    <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600', marginLeft: 4 }}>
                      {formatNoteDate(latestNote.addedAt)}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })()}

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

          {/* Card Bottom Footer: Status on left & Edit/Delete on right */}
          <View style={styles.cardBottomRow}>
            <View style={styles.cardStatusContainer}>
              <Icon name="info" size={15} color="#10b981" />
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

            <View style={styles.bottomActionsContainer}>
              <TouchableOpacity
                style={[styles.bottomActionButton, styles.bottomEditButton]}
                onPress={() => handleShowModal(employee.employeeType, employee)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Icon name="edit" size={15} color="#2563eb" />
                <Text style={styles.bottomEditText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bottomActionButton, styles.bottomDeleteButton]}
                onPress={() => handleDelete(employee._id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Icon name="delete-outline" size={16} color="#ef4444" />
                <Text style={styles.bottomDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Team's USP</Text>
              <Text style={styles.headerSubtitle}>
                Manage employees featured in USP categories
              </Text>
            </View>
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
              style={[styles.addManualButton, (isAdmin && employees.length > 0) && { flex: 1.3 }]}
              onPress={() => handleShowModal('manual')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.gradientButton}
              >
                <Icon name="person-add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Manually</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Delete All Button (Only for Admin) */}
            {isAdmin && employees.length > 0 && (
              <TouchableOpacity
                style={styles.actionDeleteAllBtn}
                onPress={handleDeleteAll}
                activeOpacity={0.85}
              >
                <Icon name="delete-sweep" size={20} color="#fff" />
                <Text style={styles.actionDeleteAllText}>Delete All</Text>
              </TouchableOpacity>
            )}
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

        {/* ── DETAILS DIALOG MODAL ── */}
        <Modal
          visible={detailsModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <View style={styles.detailsModalOverlay}>
            <View style={styles.detailsModalContainer}>
              {/* Header */}
              <View style={styles.detailsModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailsModalTitle}>Team USP Details</Text>
                  <Text style={styles.detailsModalSubtitle}>
                    {selectedEmployeeDetails?.category?.name || 'Category'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.detailsCloseBtn}
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Icon name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView style={styles.detailsModalBody} showsVerticalScrollIndicator={false}>
                {selectedEmployeeDetails && (
                  <>
                    {/* Person Card */}
                    <View style={styles.detailsPersonCard}>
                      <View style={styles.detailsAvatar}>
                        <Icon name="person" size={28} color="#fff" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.detailsPersonName}>
                          {selectedEmployeeDetails.employeeType === 'system'
                            ? selectedEmployeeDetails.employee?.name
                            : selectedEmployeeDetails.manualName}
                        </Text>
                        <Text style={styles.detailsPersonPhone}>
                          📞 {selectedEmployeeDetails.employeeType === 'system'
                            ? selectedEmployeeDetails.employee?.phone
                            : selectedEmployeeDetails.manualPhone}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <View style={[
                            styles.typeBadge,
                            { backgroundColor: selectedEmployeeDetails.employeeType === 'system' ? '#3b82f6' : '#f59e0b' }
                          ]}>
                            <Text style={styles.typeBadgeText}>
                              {selectedEmployeeDetails.employeeType === 'system' ? 'System Employee' : 'Manual Entry'}
                            </Text>
                          </View>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: selectedEmployeeDetails.isActive ? '#10b981' : '#6b7280' }
                          ]}>
                            <Text style={styles.statusBadgeText}>
                              {selectedEmployeeDetails.isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Expertise & Experience */}
                    <View style={styles.detailsSectionCard}>
                      <Text style={styles.detailsSectionHeading}>Expertise & Experience</Text>
                      <View style={styles.detailsInfoRow}>
                        <Text style={styles.detailsInfoLabel}>Expertise:</Text>
                        <Text style={styles.detailsInfoValue}>{selectedEmployeeDetails.expertise || 'Not specified'}</Text>
                      </View>
                      <View style={styles.detailsInfoRow}>
                        <Text style={styles.detailsInfoLabel}>Experience:</Text>
                        <Text style={styles.detailsInfoValue}>{selectedEmployeeDetails.experienceYears ? `${selectedEmployeeDetails.experienceYears} Years` : '0 Years'}</Text>
                      </View>
                      <View style={styles.detailsInfoRow}>
                        <Text style={styles.detailsInfoLabel}>Category:</Text>
                        <Text style={styles.detailsInfoValue}>{selectedEmployeeDetails.category?.name || 'N/A'}</Text>
                      </View>
                    </View>

                    {/* Descriptions & History */}
                    <View style={styles.detailsSectionCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Icon name="history" size={18} color="#0d9488" style={{ marginRight: 6 }} />
                          <Text style={styles.detailsSectionHeading}>All Notes & Comments</Text>
                        </View>
                        {(() => {
                          const allModalNotes = parseDescriptionHistory(selectedEmployeeDetails);
                          return allModalNotes.length > 0 ? (
                            <View style={{ backgroundColor: '#ccfbf1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f766e' }}>
                                {allModalNotes.length} {allModalNotes.length === 1 ? 'Note' : 'Notes'}
                              </Text>
                            </View>
                          ) : null;
                        })()}
                      </View>
                      {(() => {
                        const allModalNotes = parseDescriptionHistory(selectedEmployeeDetails);
                        if (allModalNotes.length === 0) {
                          return (
                            <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', paddingVertical: 4 }}>
                              No descriptions or notes recorded yet.
                            </Text>
                          );
                        }
                        return allModalNotes.map((item, idx) => (
                          <View key={idx} style={styles.detailsNoteItem}>
                            <View style={styles.detailsNoteHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: 4,
                                  backgroundColor: idx === allModalNotes.length - 1 ? '#10b981' : '#9ca3af',
                                  marginRight: 6
                                }} />
                                <Text style={styles.detailsNoteIndex}>
                                  Note #{idx + 1} {idx === allModalNotes.length - 1 && allModalNotes.length > 1 ? '(Latest)' : ''}
                                </Text>
                              </View>
                              <Text style={styles.detailsNoteTime}>
                                {formatNoteDate(item.addedAt)}
                              </Text>
                            </View>
                            <Text style={styles.detailsNoteText}>{item.text}</Text>
                          </View>
                        ));
                      })()}
                    </View>

                    {/* Reminder / Schedule */}
                    <View style={styles.detailsSectionCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={styles.detailsSectionHeading}>Reminder & Scheduling</Text>
                        <Icon name="alarm" size={18} color="#d97706" />
                      </View>
                      {selectedEmployeeDetails.scheduledDateTime || selectedEmployeeDetails.isReminderActive ? (
                        <>
                          <View style={styles.detailsInfoRow}>
                            <Text style={styles.detailsInfoLabel}>Title:</Text>
                            <Text style={styles.detailsInfoValue}>{selectedEmployeeDetails.reminderTitle || 'Team USP Reminder'}</Text>
                          </View>
                          <View style={styles.detailsInfoRow}>
                            <Text style={styles.detailsInfoLabel}>Scheduled Date & Time:</Text>
                            <Text style={styles.detailsInfoValue}>
                              {selectedEmployeeDetails.scheduledDateTime ? new Date(selectedEmployeeDetails.scheduledDateTime).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              }) : 'Not set'}
                            </Text>
                          </View>
                          <View style={styles.detailsInfoRow}>
                            <Text style={styles.detailsInfoLabel}>Repeat Frequency:</Text>
                            <Text style={[styles.detailsInfoValue, { textTransform: 'capitalize', color: '#2563eb', fontWeight: '700' }]}>
                              {selectedEmployeeDetails.repeatType === 'custom' && selectedEmployeeDetails.customDurationMinutes
                                ? `Every ${selectedEmployeeDetails.customDurationMinutes} Minutes`
                                : (selectedEmployeeDetails.repeatType || 'None')}
                            </Text>
                          </View>
                          <View style={styles.detailsInfoRow}>
                            <Text style={styles.detailsInfoLabel}>Assigned Employee:</Text>
                            <Text style={styles.detailsInfoValue}>
                              {selectedEmployeeDetails.assignedEmployee?.name
                                ? `${selectedEmployeeDetails.assignedEmployee.name} (${selectedEmployeeDetails.assignedEmployee.phone || ''})`
                                : 'Admin Only'}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', paddingVertical: 4 }}>
                          No reminder currently scheduled for this entry.
                        </Text>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={styles.detailsModalFooter}>
                <TouchableOpacity
                  style={styles.detailsEditBtn}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    if (selectedEmployeeDetails) {
                      handleShowModal(selectedEmployeeDetails.employeeType, selectedEmployeeDetails);
                    }
                  }}
                >
                  <Icon name="edit" size={18} color="#fff" />
                  <Text style={styles.detailsEditBtnText}>Edit Team's USP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.detailsCloseActionBtn}
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Text style={styles.detailsCloseActionBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

                {/* Description in Edit Mode vs Add Mode */}
                {editingEmployee ? (
                  <View style={styles.formGroup}>
                    {/* Previous Descriptions (Locked / Read Only) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={styles.label}>Previous Descriptions / Notes</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Icon name="lock" size={12} color="#64748b" />
                        <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600', marginLeft: 3 }}>Cannot be edited</Text>
                      </View>
                    </View>

                    <View style={{
                      backgroundColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 12,
                      maxHeight: 150,
                    }}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                        {editingEmployee.descriptionHistory && editingEmployee.descriptionHistory.length > 0 ? (
                          editingEmployee.descriptionHistory.map((item, idx) => (
                            <View key={idx} style={{ marginBottom: idx < editingEmployee.descriptionHistory.length - 1 ? 8 : 0, borderBottomWidth: idx < editingEmployee.descriptionHistory.length - 1 ? 1 : 0, borderBottomColor: '#e2e8f0', paddingBottom: 6 }}>
                              <Text style={{ fontSize: 13, color: '#334155', lineHeight: 18 }}>{item.text}</Text>
                              <Text style={{ fontSize: 11, color: '#0d9488', fontWeight: '600', marginTop: 3 }}>
                                🕒 Added: {item.addedAt ? new Date(item.addedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                              </Text>
                            </View>
                          ))
                        ) : formData.description ? (
                          <View>
                            <Text style={{ fontSize: 13, color: '#334155', lineHeight: 18 }}>{formData.description}</Text>
                            {editingEmployee.createdAt && (
                              <Text style={{ fontSize: 11, color: '#0d9488', fontWeight: '600', marginTop: 3 }}>
                                🕒 Added: {new Date(editingEmployee.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </Text>
                            )}
                          </View>
                        ) : (
                          <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No previous description recorded.</Text>
                        )}
                      </ScrollView>
                    </View>

                    {/* Add New Description */}
                    <Text style={[styles.label, { color: '#0f766e', fontWeight: '700' }]}>+ Add New Description / Note</Text>
                    <View style={[styles.textAreaContainer, { borderColor: '#0d9488' }]}>
                      <Icon name="note-add" size={20} color="#0d9488" />
                      <TextInput
                        style={styles.textArea}
                        placeholder="Type new note or description here..."
                        placeholderTextColor="#9ca3af"
                        value={newDescription}
                        onChangeText={setNewDescription}
                        multiline
                        numberOfLines={3}
                        onFocus={() => {
                          setTimeout(() => {
                            modalScrollRef.current?.scrollToEnd({ animated: true });
                          }, 250);
                        }}
                      />
                    </View>
                  </View>
                ) : (
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
                )}

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
                              return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
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
                              const m = String(d.getMinutes()).padStart(2, '0');
                              const ap = h >= 12 ? 'PM' : 'AM';
                              h = h % 12 || 12;
                              return `${String(h).padStart(2, '0')}:${m} ${ap}`;
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
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2,
    lineHeight: 18,
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
    alignItems: 'center',
    gap: 10,
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
  actionDeleteAllBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    elevation: 3,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  actionDeleteAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
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
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  bottomEditButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  bottomEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  bottomDeleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  bottomDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
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
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
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

  // Details Modal Styles
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  detailsModalContainer: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  detailsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  detailsModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailsModalSubtitle: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '700',
    marginTop: 2,
  },
  detailsCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsModalBody: {
    padding: 16,
  },
  detailsPersonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  detailsAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsPersonName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  detailsPersonPhone: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  detailsSectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailsSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  detailsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  detailsInfoLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },
  detailsInfoValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  detailsNoteItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0d9488',
  },
  detailsNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailsNoteIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
  },
  detailsNoteTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  detailsNoteText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  detailsModalFooter: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  detailsEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  detailsEditBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  detailsCloseActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCloseActionBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default USPEmployeesScreen;
