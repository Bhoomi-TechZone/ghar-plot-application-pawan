/**
 * EnquiriesScreen.js
 * Comprehensive CRM Admin screen for managing customer enquiries
 * Refactored with modular components and full CRM features
 * Updated with ReminderNotificationService for background notifications
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Vibration,
  AppState,
} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReminderPopup from '../../components/Reminders/ReminderPopup';
import ReminderNotificationService from '../../../services/ReminderNotificationService';

// Import services
import {
  getAllEnquiriesMerged,
  getAvailableRoles,
  assignEnquiriesToEmployee,
  unassignEnquiry,
  createReminder,
  createFollowUp,
  addManualEnquiry,
  getEnquiryDetails,
  getEnquiryReminders
} from '../../services/crmEnquiryApi';
import { getAllEmployees } from '../../services/crmEmployeeManagementApi';

// Import components
import EnquiryCard from '../../components/Enquiries/EnquiryCard';
import AddEnquiryModal from '../../components/Enquiries/modals/AddEnquiryModal';
import AssignEnquiryModal from '../../components/Enquiries/modals/AssignEnquiryModal';
import AutoAssignModal from '../../components/Enquiries/modals/AutoAssignModal';
import ReminderModal from '../../components/Enquiries/modals/ReminderModal';
import FollowUpModal from '../../components/Enquiries/modals/FollowUpModal';

// Import styles
import styles from './EnquiriesScreenStyles';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

// Import debug helper in development mode
if (__DEV__) {
  import('./enquiriesDebug');
}

const EnquiriesScreen = ({ navigation, route }) => {
  // Data states
  const [enquiries, setEnquiries] = useState([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState([]);
  const [stats, setStats] = useState({ total: 0, client: 0, manual: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Employee and role data
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);

  // UI states
  const [searchText, setSearchText] = useState('');
  const [filterSource, setFilterSource] = useState('all'); // all, client, manual
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // Pagination states (increased to show more items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Increased from 10 to 50 to show more enquiries per page

  // Selection states
  const [selectedEnquiries, setSelectedEnquiries] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [autoAssignModalVisible, setAutoAssignModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false);

  // Permission states
  const [userRole, setUserRole] = useState('admin');

  // Reminder popup state
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [currentReminder, setCurrentReminder] = useState(null);

  // Comment states
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [userName, setUserName] = useState('Admin User');

  // Get user name on mount
  useEffect(() => {
    const getUserName = async () => {
      try {
        const adminName = await AsyncStorage.getItem('adminName');
        const employeeName = await AsyncStorage.getItem('employeeName');
        const name = await AsyncStorage.getItem('userName');
        setUserName(adminName || employeeName || name || 'Admin User');
      } catch (error) {
        console.log('Error getting user name:', error);
      }
    };
    getUserName();
  }, []);

  // Add comment to enquiry
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      CrossPlatformAlert.alert('Error', 'Please enter a comment');
      return;
    }

    if (!selectedEnquiry?._id) {
      CrossPlatformAlert.alert('Error', 'No enquiry selected');
      return;
    }

    setIsAddingComment(true);
    try {
      const token = await AsyncStorage.getItem('adminToken') ||
        await AsyncStorage.getItem('crm_auth_token') ||
        await AsyncStorage.getItem('employee_auth_token') ||
        await AsyncStorage.getItem('employee_token');

      if (!token) {
        CrossPlatformAlert.alert('Error', 'Please login again');
        return;
      }

      const response = await fetch(
        `https://gharplotbackend.gntechnology.de/api/inquiry/comment/${selectedEnquiry._id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            comment: newComment.trim(),
            addedBy: userName,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('✅ Comment added successfully');
        setNewComment('');

        // Update selected enquiry with new comments
        if (result.data) {
          setSelectedEnquiry(prev => ({
            ...prev,
            comments: result.data.comments || [],
            majorComments: result.data.majorComments || prev.majorComments
          }));
        }

        CrossPlatformAlert.alert('Success', 'Comment added successfully!');
        // Refresh enquiries list
        fetchEnquiries();
      } else {
        throw new Error(result.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  // 🔔 NOTIFICATION NAVIGATION: Handle navigation from notifications
  useEffect(() => {
    if (route?.params) {
      const {
        fromNotification,
        enquiryId,
        scrollToEnquiry,
        showDetails,
        clientName,
        isReminderNotification,
        highlightEnquiry,
        reminderData
      } = route.params;

      if (fromNotification && (enquiryId || scrollToEnquiry || highlightEnquiry)) {
        console.log('🔔 Processing notification navigation:', {
          enquiryId,
          scrollToEnquiry,
          showDetails,
          clientName,
          isReminderNotification,
          highlightEnquiry
        });

        // Wait for enquiries to load, then highlight and show details
        const handleNotificationNavigation = setTimeout(async () => {
          try {
            // Find the specific enquiry using any available ID
            const targetId = enquiryId || scrollToEnquiry || highlightEnquiry;
            const targetEnquiry = enquiries.find(
              enquiry => enquiry._id === targetId || enquiry.id === targetId
            );

            if (targetEnquiry) {
              console.log('✅ Found target enquiry from notification:', targetEnquiry.clientName);

              // Set the enquiry as selected and show details
              setSelectedEnquiry(targetEnquiry);

              if (showDetails) {
                setDetailsModalVisible(true);
              }

              // Special handling for reminder notifications
              if (isReminderNotification) {
                // Vibrate to indicate reminder notification
                Vibration.vibrate([100, 50, 100]);
                showInfoToast(`⏰ Reminder: ${clientName || targetEnquiry.clientName}`);

                // Auto-open details for reminder notifications
                setTimeout(() => {
                  setDetailsModalVisible(true);
                }, 500);
              } else {
                // Show success toast for regular notifications
                showInfoToast(`📱 Opened enquiry for ${clientName || targetEnquiry.clientName}`);
              }

              // Clear the notification params to prevent re-trigger
              navigation.setParams({
                fromNotification: false,
                enquiryId: null,
                scrollToEnquiry: null,
                showDetails: false,
                isReminderNotification: false,
                highlightEnquiry: null
              });

            } else {
              console.warn('⚠️ Target enquiry not found:', targetId);
              const toastMessage = isReminderNotification
                ? `Reminder enquiry not found for ${clientName || 'client'}`
                : `Enquiry not found for ${clientName || 'client'}`;
              showWarningToast(toastMessage);
            }
          } catch (error) {
            console.error('❌ Error processing notification navigation:', error);
            showErrorToast('Could not open enquiry details');
          }
        }, 1000); // Wait 1 second for enquiries to load

        return () => clearTimeout(handleNotificationNavigation);
      }
    }
  }, [route?.params, enquiries, navigation]);

  // 🔔 NOTIFICATION SERVICE: Initialize notification service on mount
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const initialized = await ReminderNotificationService.initialize();
        if (initialized) {
          console.log('✅ Notification service ready for background reminders');
          // Clean up expired reminders
          await ReminderNotificationService.cleanupExpiredReminders();
        } else {
          console.warn('⚠️ Failed to initialize notification service');
        }
      } catch (error) {
        console.error('❌ Notification service initialization error:', error);
      }
    };

    initializeNotifications();
  }, []);

  // Check user permissions
  useEffect(() => {
    checkUserPermissions();
  }, []);

  const checkUserPermissions = async () => {
    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      console.log('🔐 Token check:', {
        hasAdminToken: !!adminToken,
        hasEmployeeToken: !!employeeToken,
        adminTokenLength: adminToken?.length || 0,
        employeeTokenLength: employeeToken?.length || 0
      });

      if (adminToken) {
        setUserRole('admin');
      } else if (employeeToken) {
        setUserRole('employee');
      } else {
        setUserRole('user');
        console.warn('⚠️ No authentication token found - may not be able to fetch data');
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setUserRole('user');
    }
  };

  // Fetch enquiries data with enhanced error handling
  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching enquiries...');
      const response = await getAllEnquiriesMerged();
      console.log('📝 API Response:', response);

      if (response.success) {
        console.log('✅ Enquiries fetched successfully:', {
          total: response.data?.length || 0,
          stats: response.stats
        });
        setEnquiries(response.data || []);
        setFilteredEnquiries(response.data || []);
        setStats(response.stats || { total: 0, client: 0, manual: 0 });
      } else {
        console.warn('❌ Failed to fetch enquiries:', response.message);
        showErrorToast('Failed to fetch enquiries');
        setEnquiries([]);
        setFilteredEnquiries([]);
      }
    } catch (error) {
      console.error('❌ Error fetching enquiries:', error);
      showErrorToast('Failed to fetch enquiries. Please try again.');
      setEnquiries([]);
      setFilteredEnquiries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch available employees for assignment with error handling
  const fetchEmployees = async () => {
    if (userRole !== 'admin') return;

    try {
      setEmployeesLoading(true);
      console.log('👥 Fetching ALL employees from EnquiriesScreen...');

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

        if (result.employees.length === 0) {
          showInfoToast('No employees found. Please create employees in Employee Management first.');
        }
      } else {
        console.warn('⚠️ Failed to fetch employees:', result);
        showErrorToast('Failed to fetch employees');
        setEmployees([]);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      showErrorToast('Failed to fetch employees. Make sure employees exist in the system.');
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Fetch available roles for auto assignment with error handling
  const fetchRoles = async () => {
    if (userRole !== 'admin') return;

    try {
      setRolesLoading(true);
      const response = await getAvailableRoles();

      if (response.success) {
        setRoles(response.data || []);
      } else {
        console.warn('Failed to fetch roles:', response.message);
        showErrorToast('Failed to fetch roles');
        setRoles([]);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      showErrorToast('Failed to fetch roles');
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEnquiries();
    if (userRole === 'admin') {
      fetchEmployees();
      fetchRoles();
    }
  }, [userRole]);

  // Filter enquiries based on search and source
  useEffect(() => {
    console.log('🔍 Filtering enquiries:', {
      totalEnquiries: enquiries.length,
      searchText,
      filterSource
    });

    let filtered = enquiries;

    // Filter by source
    if (filterSource !== 'all') {
      filtered = filtered.filter(enquiry =>
        enquiry.source === filterSource
      );
    }

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(enquiry => {
        // Safe property access to avoid object rendering issues
        const clientName = enquiry.clientName || '';
        const email = enquiry.email || '';
        const contactNumber = enquiry.contactNumber || '';
        const propertyId = typeof enquiry.propertyId === 'object' ? enquiry.propertyId?._id : enquiry.propertyId;
        const propertyLocation = enquiry.propertyLocation || '';

        return clientName.toLowerCase().includes(searchLower) ||
          email.toLowerCase().includes(searchLower) ||
          contactNumber.includes(searchText) ||
          (propertyId && propertyId.toString().includes(searchText)) ||
          propertyLocation.toLowerCase().includes(searchLower);
      });
    }

    console.log('✅ Filtered result:', filtered.length, 'enquiries');
    setFilteredEnquiries(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [enquiries, searchText, filterSource]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEnquiries = filteredEnquiries.slice(startIndex, endIndex);

  console.log('📊 Pagination Debug:', {
    totalEnquiries: enquiries.length,
    filteredEnquiries: filteredEnquiries.length,
    currentPage,
    totalPages,
    paginatedCount: paginatedEnquiries.length,
    startIndex,
    endIndex
  });

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSelectedEnquiries([]);
    setSelectionMode(false);
    fetchEnquiries();
    if (userRole === 'admin') {
      fetchEmployees();
      fetchRoles();
    }
  }, [userRole]);

  // Show toast message with different types (matching web implementation)
  const showToast = (message, type = 'SHORT') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, type === 'LONG' ? ToastAndroid.LONG : ToastAndroid.SHORT);
    } else {
      // For iOS, use Alert as fallback (or install react-native-toast-message for better experience)
      CrossPlatformAlert.alert('', message);
    }
  };

  const showSuccessToast = (message) => showToast(`✅ ${message}`, 'SHORT');
  const showErrorToast = (message) => showToast(`❌ ${message}`, 'LONG');
  const showWarningToast = (message) => showToast(`⚠️ ${message}`, 'LONG');
  const showInfoToast = (message) => showToast(`ℹ️ ${message}`, 'SHORT');

  // Handle enquiry selection with validation (matching web)
  const handleEnquirySelect = (enquiry) => {
    // Cannot select enquiries that are already assigned (matching web)
    if (enquiry.assignment) {
      showWarningToast('Cannot select enquiries that are already assigned to an employee');
      return;
    }

    const enquirySelection = {
      enquiryId: enquiry._id,
      enquiryType: enquiry.enquiryType
    };

    const isSelected = selectedEnquiries.some(
      selected => selected.enquiryId === enquiry._id
    );

    if (isSelected) {
      setSelectedEnquiries(prev =>
        prev.filter(selected => selected.enquiryId !== enquiry._id)
      );
    } else {
      setSelectedEnquiries(prev => [...prev, enquirySelection]);
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedEnquiries([]);
    }
  };

  // Select all enquiries
  const handleSelectAll = () => {
    const unassignedEnquiries = filteredEnquiries.filter(
      enquiry => !enquiry.assignment
    );

    if (selectedEnquiries.length === unassignedEnquiries.length) {
      setSelectedEnquiries([]);
    } else {
      const allSelections = unassignedEnquiries.map(enquiry => ({
        enquiryId: enquiry._id,
        enquiryType: enquiry.enquiryType,
      }));
      setSelectedEnquiries(allSelections);
    }
  };

  // Handle unassign with enhanced notifications
  const handleUnassign = async (enquiry) => {
    CrossPlatformAlert.alert(
      'Unassign Enquiry',
      `Are you sure you want to unassign this enquiry from ${enquiry.assignment?.employeeId?.fullName || enquiry.assignment?.employeeId || 'the assigned employee'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await unassignEnquiry(enquiry._id, enquiry.enquiryType);
              if (result.success) {
                showSuccessToast('Lead unassigned successfully');
                fetchEnquiries();
              } else {
                showErrorToast(result.message || 'Failed to unassign enquiry');
              }
            } catch (error) {
              showErrorToast('Failed to unassign enquiry. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Modal handlers with enhanced toast notifications
  const handleAddSuccess = () => {
    setAddModalVisible(false);
    fetchEnquiries();
    showSuccessToast('Enquiry created successfully!');
  };

  const handleAssignSuccess = () => {
    setAssignModalVisible(false);
    setSelectedEnquiries([]);
    setSelectionMode(false);
    fetchEnquiries();
    showSuccessToast('Enquiries assigned successfully!');
  };

  const handleAutoAssignSuccess = () => {
    setAutoAssignModalVisible(false);
    setSelectedEnquiries([]);
    setSelectionMode(false);
    fetchEnquiries();
    showSuccessToast('Auto assignment completed!');
  };

  const handleReminderSuccess = (enquiry) => {
    setReminderModalVisible(false);
    fetchEnquiries(); // Refresh enquiries to get updated reminder count
    const isExistingCustomer = enquiry?.source === 'client' || enquiry?.enquiryType === 'Inquiry';
    const message = isExistingCustomer
      ? '✅ Reminder set successfully for existing customer!'
      : '✅ Reminder created successfully!';
    showSuccessToast(message);

    // If details modal is open, refresh it too
    if (detailsModalVisible && selectedEnquiry) {
      console.log('🔄 Refreshing enquiry details after reminder set...');
      setTimeout(() => {
        showEnquiryDetails(selectedEnquiry);
      }, 500); // Small delay to ensure reminder is saved in backend
    }
  };

  const handleFollowUpSuccess = () => {
    setFollowUpModalVisible(false);
    fetchEnquiries();
    showSuccessToast('Follow-up created successfully!');
  };

  const handleSetReminder = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setReminderModalVisible(true);
  };

  const handleFollowUp = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setFollowUpModalVisible(true);
  };

  const showEnquiryDetails = async (enquiry) => {
    if (!selectionMode) {
      // Show modal first with basic data
      setSelectedEnquiry(enquiry);
      setDetailsModalVisible(true);

      // Then fetch full details with reminders and followUps
      try {
        console.log('📋 ===== FETCHING ENQUIRY DETAILS =====');
        console.log('📋 Enquiry ID:', enquiry._id);
        console.log('📋 Client Name:', enquiry.clientName);
        console.log('📋 Contact:', enquiry.contactNumber);
        console.log('📋 Source:', enquiry.source);

        const result = await getEnquiryDetails(enquiry._id, enquiry.source);

        if (result.success && result.data) {
          console.log('✅ Got full enquiry details');
          console.log('📊 Reminders in response:', result.data.reminders?.length || 0);

          if (result.data.reminders && result.data.reminders.length > 0) {
            console.log('📋 Reminders found in main response:');
            result.data.reminders.forEach((r, i) => {
              console.log(`  ${i + 1}. Date: ${r.reminderDateTime}, Note: ${r.note || r.comment || 'No note'}`);
            });
          }

          // If reminders not populated, fetch them separately
          if (!result.data.reminders || result.data.reminders.length === 0) {
            console.log('📋 Reminders not populated, fetching separately...');
            console.log('🔍 Searching with client:', result.data.clientName, 'phone:', result.data.contactNumber);

            // First try to get local reminders from AsyncStorage
            try {
              const localRemindersJson = await AsyncStorage.getItem('localReminders');
              if (localRemindersJson) {
                const allLocalReminders = JSON.parse(localRemindersJson);
                console.log('📱 Total local reminders:', allLocalReminders.length);

                // Filter by enquiryId
                const localEnquiryReminders = allLocalReminders.filter(r =>
                  r.enquiryId === enquiry._id ||
                  r.clientName === result.data.clientName ||
                  r.phone === result.data.contactNumber
                );

                if (localEnquiryReminders.length > 0) {
                  console.log('✅ Found', localEnquiryReminders.length, 'LOCAL reminders for this enquiry:');
                  localEnquiryReminders.forEach((r, i) => {
                    console.log(`  ${i + 1}. Date: ${r.scheduledDate || r.reminderDateTime}`);
                    console.log(`     Note: ${r.note || r.message || 'No note'}`);
                    console.log(`     Status: ${r.status || 'pending'}`);
                  });

                  // Convert to standard format and assign
                  result.data.reminders = localEnquiryReminders.map(r => ({
                    _id: r.id || r._id,
                    clientName: r.clientName,
                    phone: r.phone,
                    note: r.note || r.message,
                    reminderDateTime: r.scheduledDate || r.reminderDateTime,
                    status: r.status || 'pending',
                    comment: r.comment || '',
                    source: 'local'
                  }));
                }
              }
            } catch (localError) {
              console.warn('⚠️ Error fetching local reminders:', localError);
            }

            // If no local reminders found, try backend API
            if (!result.data.reminders || result.data.reminders.length === 0) {
              const remindersResult = await getEnquiryReminders(result.data);

              if (remindersResult.success && remindersResult.data && remindersResult.data.length > 0) {
                console.log('✅ Fetched', remindersResult.data.length, 'reminders from backend:');
                remindersResult.data.forEach((r, i) => {
                  console.log(`  ${i + 1}. Date: ${r.reminderDateTime}`);
                  console.log(`     Note: ${r.note || 'No note'}`);
                  console.log(`     Comment: ${r.comment || 'No comment'}`);
                  console.log(`     Status: ${r.status || 'pending'}`);
                });
                result.data.reminders = remindersResult.data;
              } else {
                console.log('⚠️ No reminders found in backend or local storage');
              }
            }
          }

          console.log('📋 Final enquiry data has', result.data.reminders?.length || 0, 'reminders');
          setSelectedEnquiry(result.data);
        } else {
          console.warn('⚠️ Could not fetch full details:', result.message);

          // Try to get local reminders first from AsyncStorage
          console.log('📋 Trying to fetch LOCAL reminders for:', enquiry.clientName, enquiry.contactNumber);
          try {
            const localRemindersJson = await AsyncStorage.getItem('localReminders');
            if (localRemindersJson) {
              const allLocalReminders = JSON.parse(localRemindersJson);
              console.log('📱 Total local reminders:', allLocalReminders.length);

              // Filter by enquiryId
              const localEnquiryReminders = allLocalReminders.filter(r =>
                r.enquiryId === enquiry._id ||
                r.clientName === enquiry.clientName ||
                r.phone === enquiry.contactNumber
              );

              if (localEnquiryReminders.length > 0) {
                console.log('✅ Found', localEnquiryReminders.length, 'LOCAL reminders:');
                localEnquiryReminders.forEach((r, i) => {
                  console.log(`  ${i + 1}. Note: ${r.note || r.message || 'No note'}`);
                });

                enquiry.reminders = localEnquiryReminders.map(r => ({
                  _id: r.id || r._id,
                  clientName: r.clientName,
                  phone: r.phone,
                  note: r.note || r.message,
                  reminderDateTime: r.scheduledDate || r.reminderDateTime,
                  status: r.status || 'pending',
                  comment: r.comment || '',
                  source: 'local'
                }));
                setSelectedEnquiry({ ...enquiry });
              }
            }
          } catch (localError) {
            console.warn('⚠️ Error fetching local reminders:', localError);
          }

          // If no local reminders, try backend API
          if (!enquiry.reminders || enquiry.reminders.length === 0) {
            console.log('📋 Trying to fetch reminders from backend...');
            const remindersResult = await getEnquiryReminders(enquiry);

            if (remindersResult.success && remindersResult.data && remindersResult.data.length > 0) {
              console.log('✅ Found', remindersResult.data.length, 'reminders from backend:');
              remindersResult.data.forEach((r, i) => {
                console.log(`  ${i + 1}. Note: ${r.note || r.comment || 'No note'}`);
              });
              enquiry.reminders = remindersResult.data;
              setSelectedEnquiry({ ...enquiry });
            } else {
              console.log('⚠️ No reminders found in local or backend');
            }
          }
        }
        console.log('📋 ===== END FETCHING DETAILS =====');
      } catch (error) {
        console.error('❌ Error fetching enquiry details:', error);
      }
    }
  };

  // Render enquiry item
  const renderEnquiryItem = ({ item }) => {
    const isSelected = selectedEnquiries.some(
      selected => selected.enquiryId === item._id
    );
    const canSelect = !item.assignment; // Can only select unassigned enquiries

    return (
      <EnquiryCard
        enquiry={item}
        isSelected={isSelected}
        onSelect={() => handleEnquirySelect(item)}
        onPress={() => showEnquiryDetails(item)}
        onSetReminder={handleSetReminder}
        onFollowUp={handleFollowUp}
        onUnassign={handleUnassign}
        canSelect={canSelect}
        showCheckbox={selectionMode}
      />
    );
  };

  // Filter buttons
  const FilterButtons = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: 'All', count: stats.total },
        { key: 'client', label: 'Client', count: stats.client },
        { key: 'manual', label: 'Manual', count: stats.manual },
      ].map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            filterSource === filter.key && styles.filterButtonActive
          ]}
          onPress={() => setFilterSource(filter.key)}
        >
          <Text style={[
            styles.filterButtonText,
            filterSource === filter.key && styles.filterButtonTextActive
          ]}>
            {filter.label} ({filter.count})
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Empty state
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 64, color: '#d1d5db' }}>📧</Text>
      <Text style={styles.emptyTitle}>No Leads Found</Text>
      <Text style={styles.emptyMessage}>
        {searchText ? 'No leads match your search.' : 'No leads available.'}
      </Text>
      {userRole === 'admin' && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={{ fontSize: 24, color: '#ffffff' }}>+</Text>
          <Text style={styles.addButtonText}>Add First Lead</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Calculate unassigned count for select all button
  const unassignedCount = filteredEnquiries.filter(enquiry => !enquiry.assignment).length;

  return (
    <View style={styles.container}>
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.addEnquiryButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={{ fontSize: 20, color: '#ffffff' }}>+</Text>
          <Text style={styles.addEnquiryText}>Add Lead</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectionButton, selectionMode && styles.selectionButtonActive]}
          onPress={toggleSelectionMode}
        >
          <Text style={{ fontSize: 20, color: '#ffffff' }}>{selectionMode ? "×" : "✓"}</Text>
          <Text style={styles.selectionButtonText}>
            {selectionMode ? 'Cancel' : 'Select'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Assignment Bar */}
      {selectedEnquiries.length > 0 && (
        <View style={styles.assignmentBar}>
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => setAssignModalVisible(true)}
          >
            <Text style={{ fontSize: 18, color: '#ffffff' }}>👤</Text>
            <Text style={styles.assignButtonText}>Assign ({selectedEnquiries.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.autoAssignButton}
            onPress={() => setAutoAssignModalVisible(true)}
          >
            <Text style={{ fontSize: 18, color: '#ffffff' }}>⚡</Text>
            <Text style={styles.autoAssignButtonText}>Auto Assign ({selectedEnquiries.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={handleSelectAll}
          >
            <Text style={styles.selectAllButtonText}>
              {selectedEnquiries.length === unassignedCount ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={{ fontSize: 20, color: '#6b7280' }}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, phone, property..."
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={{ fontSize: 20, color: '#6b7280' }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      <FilterButtons />

      {/* Enquiries List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading enquiries...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filteredEnquiries} // Show all filtered enquiries instead of paginated
            keyExtractor={(item) => item._id}
            renderItem={renderEnquiryItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
            ListEmptyComponent={EmptyState}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lead Details</Text>
              <TouchableOpacity
                onPress={() => setDetailsModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={{ fontSize: 24, color: '#6b7280' }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedEnquiry && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Client Information</Text>
                    <Text style={styles.modalText}>Name: {selectedEnquiry.clientName}</Text>
                    <Text style={styles.modalText}>Email: {selectedEnquiry.email || 'N/A'}</Text>
                    <Text style={styles.modalText}>Phone: {selectedEnquiry.contactNumber}</Text>
                    {selectedEnquiry.referenceBy && (
                      <Text style={styles.modalText}>Reference By: {selectedEnquiry.referenceBy}</Text>
                    )}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Property Information</Text>
                    <Text style={styles.modalText}>Property ID: {typeof selectedEnquiry.propertyId === 'object' ? selectedEnquiry.propertyId?._id || 'N/A' : selectedEnquiry.propertyId || 'N/A'}</Text>
                    <Text style={styles.modalText}>Type: {selectedEnquiry.propertyType || selectedEnquiry.productType || 'N/A'}</Text>
                    <Text style={styles.modalText}>Location: {selectedEnquiry.propertyLocation || selectedEnquiry.location}</Text>
                    {selectedEnquiry.address && (
                      <Text style={styles.modalText}>Address: {selectedEnquiry.address}</Text>
                    )}
                    {selectedEnquiry.price !== 'N/A' && (
                      <Text style={styles.modalText}>Price: ₹{typeof selectedEnquiry.price === 'object' ? 'N/A' : selectedEnquiry.price}</Text>
                    )}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Additional Details</Text>
                    <Text style={styles.modalText}>Source: {selectedEnquiry.source}</Text>
                    <Text style={styles.modalText}>Status: {selectedEnquiry.status || selectedEnquiry.caseStatus}</Text>
                    <Text style={styles.modalText}>Created: {new Date(selectedEnquiry.createdAt).toLocaleString()}</Text>
                    {selectedEnquiry.assignment && (
                      <Text style={styles.modalText}>
                        Assigned to: {selectedEnquiry.assignment.employeeId?.fullName || 'Unknown Employee'}
                      </Text>
                    )}
                    {selectedEnquiry.actionPlan && (
                      <>
                        <Text style={[styles.modalText, { fontWeight: '600', marginTop: 8, color: '#374151' }]}>Action Plan:</Text>
                        <Text style={[styles.modalText, { color: '#6b7280', fontStyle: 'italic' }]}>{selectedEnquiry.actionPlan}</Text>
                      </>
                    )}
                    {selectedEnquiry.weekOrActionTaken && (
                      <>
                        <Text style={[styles.modalText, { fontWeight: '600', marginTop: 8, color: '#374151' }]}>Week/Action Taken:</Text>
                        <Text style={[styles.modalText, { color: '#6b7280', fontStyle: 'italic' }]}>{selectedEnquiry.weekOrActionTaken}</Text>
                      </>
                    )}
                  </View>

                  {/* Major Comments (Previous Notes) - Moved to top */}
                  {selectedEnquiry.majorComments && (
                    <View style={styles.modalSection}>
                      <View style={{
                        backgroundColor: '#fef3c7',
                        padding: 12,
                        borderRadius: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: '#f59e0b',
                        marginBottom: 10
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#92400e', marginBottom: 4 }}>Previous Notes:</Text>
                        <Text style={{ fontSize: 12, color: '#78350f', lineHeight: 18 }}>
                          {selectedEnquiry.majorComments}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Comments Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>💬 Comments</Text>

                    {/* Existing Comments Array */}
                    {selectedEnquiry.comments && selectedEnquiry.comments.length > 0 ? (
                      selectedEnquiry.comments.map((comment, index) => (
                        <View key={comment._id || index} style={{
                          backgroundColor: '#f3f4f6',
                          padding: 10,
                          borderRadius: 8,
                          marginBottom: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: '#3b82f6'
                        }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#3b82f6' }}>
                              {comment.addedBy || 'Unknown'}
                            </Text>
                            <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                              {comment.addedAt ? new Date(comment.addedAt).toLocaleString() : ''}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, color: '#374151' }}>{comment.comment}</Text>
                        </View>
                      ))
                    ) : null}
                  </View>

                  {/* Add Comment Input */}
                  <View style={styles.modalSection}>
                    <View style={{
                      marginTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: '#e5e7eb',
                      paddingTop: 10
                    }}>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: '#d1d5db',
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          fontSize: 13,
                          color: '#1f2937',
                          backgroundColor: '#ffffff',
                          minHeight: 70,
                          textAlignVertical: 'top'
                        }}
                        placeholder="Add a comment..."
                        placeholderTextColor="#9ca3af"
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                        numberOfLines={3}
                      />
                      <TouchableOpacity
                        style={{
                          backgroundColor: isAddingComment ? '#9ca3af' : '#3b82f6',
                          borderRadius: 8,
                          paddingVertical: 10,
                          alignItems: 'center',
                          marginTop: 8
                        }}
                        onPress={handleAddComment}
                        disabled={isAddingComment}
                      >
                        {isAddingComment ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Add Comment</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Reminder Details Section - Moved to bottom */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Reminder Details</Text>

                    {/* Show Reminders with Notes */}
                    {selectedEnquiry.reminders && selectedEnquiry.reminders.length > 0 ? (
                      <>
                        {selectedEnquiry.reminders.map((reminder, index) => (
                          <View key={`reminder-${reminder._id || reminder.id || index}-${index}`} style={{
                            backgroundColor: '#f9fafb',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 10,
                            borderLeftWidth: 3,
                            borderLeftColor: reminder.status === 'completed' ? '#10b981' : '#f59e0b'
                          }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                              <Text style={{ fontSize: 13, color: '#374151', fontWeight: '700', flex: 1 }}>
                                📅 {new Date(reminder.reminderDateTime).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Text>
                              {/* 🏷️ Show Edited tag for reminders from EditReminderScreen */}
                              {(reminder.isEdited || reminder.source === 'edit_reminder') && (
                                <View style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                  backgroundColor: '#dbeafe',
                                  marginRight: 6
                                }}>
                                  <Text style={{
                                    fontSize: 9,
                                    color: '#2563eb',
                                    fontWeight: '600'
                                  }}>
                                    ✏️ EDITED
                                  </Text>
                                </View>
                              )}
                              <View style={{
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 4,
                                backgroundColor: reminder.status === 'completed' ? '#d1fae5' : '#fef3c7'
                              }}>
                                <Text style={{
                                  fontSize: 10,
                                  color: reminder.status === 'completed' ? '#10b981' : '#f59e0b',
                                  fontWeight: '600'
                                }}>
                                  {reminder.status?.toUpperCase() || 'PENDING'}
                                </Text>
                              </View>
                            </View>

                            {/* Reminder Note/Comment - Main highlight */}
                            {(reminder.note || reminder.comment) && (
                              <View style={{
                                backgroundColor: '#ffffff',
                                padding: 10,
                                borderRadius: 6,
                                marginBottom: 8,
                                borderWidth: 1,
                                borderColor: '#e5e7eb'
                              }}>
                                <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 4 }}>
                                  Set Reminder Note:
                                </Text>
                                <Text style={{ fontSize: 12, color: '#374151', lineHeight: 18 }}>
                                  💬 {reminder.note || reminder.comment}
                                </Text>
                              </View>
                            )}

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                                By: {reminder.createdBy?.fullName || 'Unknown'}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                                {new Date(reminder.createdAt).toLocaleDateString('en-IN')}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </>
                    ) : (
                      <Text style={styles.modalText}>No reminders set for this enquiry</Text>
                    )}
                  </View>

                  {/* Comments/Follow-ups Section */}
                  {selectedEnquiry.followUps && selectedEnquiry.followUps.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Comments & Follow-ups</Text>
                      {selectedEnquiry.followUps.map((followUp, index) => (
                        <View key={followUp._id || index} style={{
                          backgroundColor: '#eff6ff',
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: '#3b82f6'
                        }}>
                          <Text style={{ fontSize: 12, color: '#1e40af', marginBottom: 4 }}>
                            {followUp.comment || followUp.note}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#6b7280' }}>
                            By: {followUp.createdBy?.fullName || 'Unknown'} • {new Date(followUp.createdAt).toLocaleDateString('en-IN')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <AddEnquiryModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        addEnquiryAPI={addManualEnquiry}
        onSuccess={handleAddSuccess}
        totalEnquiries={enquiries.length}
        navigation={navigation}
      />

      <AssignEnquiryModal
        visible={assignModalVisible}
        onClose={() => setAssignModalVisible(false)}
        selectedEnquiries={selectedEnquiries}
        employees={employees}
        employeesLoading={employeesLoading}
        onSuccess={handleAssignSuccess}
      />

      <AutoAssignModal
        visible={autoAssignModalVisible}
        onClose={() => setAutoAssignModalVisible(false)}
        selectedEnquiries={selectedEnquiries}
        roles={roles}
        employees={employees}
        rolesLoading={rolesLoading}
        onSuccess={handleAutoAssignSuccess}
      />

      <ReminderModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        enquiry={selectedEnquiry}
        createReminderAPI={createReminder}
        onSuccess={() => handleReminderSuccess(selectedEnquiry)}
      />

      <FollowUpModal
        visible={followUpModalVisible}
        onClose={() => setFollowUpModalVisible(false)}
        enquiry={selectedEnquiry}
        createFollowUpAPI={createFollowUp}
        onSuccess={handleFollowUpSuccess}
      />

      {/* Reminder Popup */}
      {showReminderPopup && currentReminder && (
        <ReminderPopup
          visible={showReminderPopup}
          reminder={currentReminder}
          navigation={navigation}
          onClose={() => {
            setShowReminderPopup(false);
            setCurrentReminder(null);
          }}
        />
      )}
    </View>
  );
};

export default EnquiriesScreen;