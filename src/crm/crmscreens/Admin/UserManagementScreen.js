import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  Dimensions,
  Animated,
  Switch,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getUsersWithPagination,
  deleteUser,
  searchUsers,
  bulkDeleteUsers,
  assignUsersToEmployee,
} from '../../services/crmUserManagementApi';
import { getAllEmployees } from '../../services/crmEmployeeManagementApi';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width: screenWidth } = Dimensions.get('window');

const UserManagementScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Store all users for selection
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selection & Bulk Operations
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [showActivityChart, setShowActivityChart] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Assignment
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentPriority, setAssignmentPriority] = useState('medium');
  const [assignmentNotes, setAssignmentNotes] = useState('');

  // Auto Assignment
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [autoAssignEmployee, setAutoAssignEmployee] = useState('');

  // Activity Data
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Format dates
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'Invalid Date';
    }
  };

  // Format last seen
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'N/A';
    try {
      const now = new Date();
      const past = new Date(lastSeen);
      const diffMs = now - past;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays} days ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch {
      return 'N/A';
    }
  };

  // Initial resource load
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load data when current page changes
  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setIsSearching(false);
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load initial data
  const loadInitialData = async () => {
    // Only load employees, fetchUsers is handled by the currentPage effect
    try {
      await loadEmployees();
    } catch (e) {
      console.log('⚠️ Skipping employee load - not admin');
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response = await getUsersWithPagination({
        page: currentPage,
        limit: 10,
      });

      console.log('🔍 Full API Response:', JSON.stringify(response, null, 2));

      // Handle different response structures
      let users = [];
      if (response && response.users) {
        users = response.users;
      } else if (response && Array.isArray(response)) {
        users = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        users = response.data;
      }

      console.log('📊 Users found:', users.length);
      if (users.length > 0) {
        console.log('👤 Sample user:', JSON.stringify(users[0], null, 2));
      }

      // Normalize user data to ensure proper field names
      const normalizedUsers = users.map(user => ({
        id: user.id || user._id || user.user_id,
        name: user.name || user.fullName || user.full_name ||
          `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() ||
          user.username || 'Unknown User',
        email: user.email || user.emailAddress || 'No email',
        phone: user.phone || user.phoneNumber || user.mobile || 'No phone',
        location: user.location || user.address || user.city || 'Not specified',
        status: user.status || user.accountStatus || user.isActive === false ? 'inactive' : 'active',
        createdAt: user.createdAt || user.created_at || user.signupDate || user.joinedDate,
        lastSeenAt: user.lastSeenAt || user.last_seen || user.lastLogin || user.updatedAt,
        ...user // Keep all original fields as well
      }));

      console.log('✅ Normalized users:', normalizedUsers.length);
      if (normalizedUsers.length > 0) {
        console.log('👤 Sample normalized user:', JSON.stringify(normalizedUsers[0], null, 2));
      }

      if (currentPage === 1) {
        setUsers(normalizedUsers);
        setAllUsers(normalizedUsers);
      } else {
        setUsers(prev => [...prev, ...normalizedUsers]);
        setAllUsers(prev => [...prev, ...normalizedUsers]);
      }

      setTotalPages(response.totalPages || response.total_pages || Math.ceil((response.totalUsers || response.total || normalizedUsers.length) / 10) || 1);
      setTotalUsers(response.totalUsers || response.total || normalizedUsers.length || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      handleError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load employees
  const loadEmployees = async () => {
    try {
      console.log('🔄 Loading employees for assignment...');
      const response = await getAllEmployees();
      console.log('📥 Employees API response:', JSON.stringify(response, null, 2));

      // Handle different response structures
      let employeesList = [];
      if (response && response.employees) {
        employeesList = response.employees;
      } else if (response && Array.isArray(response)) {
        employeesList = response;
      } else if (response && response.data) {
        employeesList = Array.isArray(response.data) ? response.data : [];
      }

      console.log('✅ Setting employees:', employeesList.length);
      if (employeesList.length > 0) {
        console.log('👥 Employee names:', employeesList.map(e => e.name || e.fullName));
      }

      setEmployees(employeesList);

      if (employeesList.length === 0) {
        console.warn('⚠️ No employees found in the system');
      }
    } catch (error) {
      // Silently handle 401 errors - employee doesn't have admin access
      console.log('⚠️ Could not load employees (might not have admin access)');
    }
  };

  // Perform search
  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const response = await searchUsers(searchQuery);
      if (response && response.users) {
        setSearchResults(response.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      CrossPlatformAlert.alert('Error', 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle error
  const handleError = (error) => {
    if (error.message.includes('Session expired') ||
      error.message.includes('Please login again') ||
      error.message.includes('Invalid token')) {
      CrossPlatformAlert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'AdminLogin' }],
              });
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }

    if (error.message.includes('404') ||
      error.message.includes('not found') ||
      error.message.includes('Backend may not be ready')) {
      CrossPlatformAlert.alert(
        'API Not Available',
        'User Management API is not yet implemented on the backend. Please check with the backend team.',
        [{ text: 'OK' }]
      );
      setUsers([]);
      setTotalPages(1);
      return;
    }

    CrossPlatformAlert.alert('Error', error.message || 'An error occurred');
  };

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  // Select all users
  const selectAllUsers = () => {
    const allUserIds = new Set(users.map(user => user.id));
    setSelectedUsers(allUserIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedUsers(new Set());
    setIsSelectionMode(false);
  };

  // Enter selection mode
  const enterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedUsers(new Set());
  };

  // Handle user assignment
  const handleAssignUsers = async () => {
    if (selectedUsers.size === 0) {
      CrossPlatformAlert.alert('Error', 'Please select at least one user');
      return;
    }

    if (!selectedEmployee) {
      CrossPlatformAlert.alert('Error', 'Please select an employee');
      return;
    }

    try {
      setAssignmentLoading(true);

      const userIds = Array.from(selectedUsers);

      console.log('🔄 Assigning users:', {
        userIds,
        employeeId: selectedEmployee,
        priority: assignmentPriority,
        notes: assignmentNotes
      });

      const response = await assignUsersToEmployee({
        userIds,
        employeeId: selectedEmployee,
        priority: assignmentPriority,
        notes: assignmentNotes,
      });

      console.log('✅ Assignment successful:', response);

      CrossPlatformAlert.alert(
        'Success',
        `Successfully assigned ${userIds.length} user(s) to the selected employee!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAssignModal(false);
              setSelectedEmployee('');
              setAssignmentPriority('medium');
              setAssignmentNotes('');
              clearSelection();
              fetchUsers(); // Refresh user list
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Assignment failed:', error);
      CrossPlatformAlert.alert(
        'Assignment Failed',
        error.message || 'Failed to assign users. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Handle auto assignment toggle - DISABLED FOR NOW
  const handleAutoAssignmentToggle = async (enabled) => {
    CrossPlatformAlert.alert('Feature Coming Soon', 'Auto assignment feature will be available when the backend API is ready.');
    return;
  };

  // Load user activity - DISABLED FOR NOW
  const loadUserActivity = async () => {
    CrossPlatformAlert.alert('Feature Coming Soon', 'User activity chart feature will be available when the backend API is ready.');
    return;
  };

  // Handle delete users
  const handleDeleteUsers = async () => {
    if (selectedUsers.size === 0) {
      CrossPlatformAlert.alert('Error', 'Please select at least one user');
      return;
    }

    CrossPlatformAlert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${selectedUsers.size} user(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userIds = Array.from(selectedUsers);
              await bulkDeleteUsers({ userIds });

              CrossPlatformAlert.alert('Success', `${userIds.length} users deleted successfully`);
              setShowBulkDeleteModal(false);
              clearSelection();
              fetchUsers();
            } catch (error) {
              console.error('Error deleting users:', error);
              CrossPlatformAlert.alert('Error', error.message || 'Failed to delete users');
            }
          },
        },
      ]
    );
  };

  // Handle single user delete
  const handleDeleteSingleUser = (userId, userName) => {
    CrossPlatformAlert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(userId);
              CrossPlatformAlert.alert('Success', 'User deleted successfully');
              fetchUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
              CrossPlatformAlert.alert('Error', error.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  // Refresh data
  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchUsers();
  };

  // Render user card
  const renderUser = ({ item }) => {
    const isSelected = selectedUsers.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.userCard, isSelected && styles.selectedCard]}
        onPress={() => {
          if (isSelectionMode) {
            toggleUserSelection(item.id);
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            enterSelectionMode();
            toggleUserSelection(item.id);
          }
        }}
      >
        {isSelectionMode && (
          <View style={styles.selectionIndicator}>
            <MaterialCommunityIcons
              name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
              size={24}
              color={isSelected ? "#10B981" : "#94A3B8"}
            />
          </View>
        )}

        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={22} color="#fff" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {item.name || item.fullName || item.full_name ||
                  `${item.firstName || item.first_name || ''} ${item.lastName || item.last_name || ''}`.trim() ||
                  item.username || 'Unknown User'}
              </Text>
              <Text style={styles.userEmail}>
                {item.email || item.emailAddress || 'No email provided'}
              </Text>
              <Text style={styles.userPhone}>
                📞 {item.phone || item.phoneNumber || item.mobile || 'No phone'}
              </Text>
            </View>
            <View style={[styles.statusBadge, item.status === 'active' ? styles.activeStatus : styles.inactiveStatus]}>
              <Text style={styles.statusText}>{item.status?.toUpperCase() || 'UNKNOWN'}</Text>
            </View>
          </View>

          <View style={styles.userMeta}>
            <Text style={styles.metaText}>📍 {item.location || 'Not specified'}</Text>
            <Text style={styles.metaText}>📅 Joined: {formatDate(item.createdAt)}</Text>
            <Text style={styles.metaText}>👀 Last seen: {formatLastSeen(item.lastSeenAt)}</Text>
          </View>

          {/* Assignment Information */}
          {item.assignment && (
            <View style={styles.assignmentInfo}>
              <View style={styles.assignmentHeader}>
                <MaterialCommunityIcons name="account-check" size={18} color="#10B981" />
                <Text style={styles.assignmentTitle}>ASSIGNED TO</Text>
              </View>
              <View style={styles.assignmentDetails}>
                <View style={styles.assignmentRow}>
                  <MaterialCommunityIcons name="account-tie" size={16} color="#6b7280" />
                  <Text style={styles.assignmentText}>
                    {item.assignment.employeeId?.name ||
                      item.assignment.employeeName ||
                      'Unknown Employee'}
                  </Text>
                </View>
                {item.assignment.employeeId?.email && (
                  <View style={styles.assignmentRow}>
                    <MaterialCommunityIcons name="email" size={16} color="#6b7280" />
                    <Text style={styles.assignmentTextSmall}>
                      {item.assignment.employeeId.email}
                    </Text>
                  </View>
                )}
                {item.assignment.priority && (
                  <View style={styles.assignmentRow}>
                    <MaterialCommunityIcons
                      name="flag"
                      size={16}
                      color={
                        item.assignment.priority === 'urgent' ? '#EF4444' :
                          item.assignment.priority === 'high' ? '#F59E0B' :
                            item.assignment.priority === 'medium' ? '#10B981' :
                              '#6B7280'
                      }
                    />
                    <Text style={[
                      styles.priorityText,
                      {
                        color: item.assignment.priority === 'urgent' ? '#EF4444' :
                          item.assignment.priority === 'high' ? '#F59E0B' :
                            item.assignment.priority === 'medium' ? '#10B981' :
                              '#6B7280'
                      }
                    ]}>
                      {item.assignment.priority?.toUpperCase() || 'MEDIUM'}
                    </Text>
                  </View>
                )}
                {/* Assigned By Information */}
                {(item.assignment.assignedBy || item.assignment.assignedById) && (
                  <View style={styles.assignmentRow}>
                    <MaterialCommunityIcons name="account-arrow-right" size={16} color="#8B5CF6" />
                    <Text style={styles.assignmentTextSmall}>
                      Assigned by: {item.assignment.assignedBy?.name ||
                        item.assignment.assignedById?.name ||
                        item.assignment.assignedByName ||
                        'Unknown'}
                    </Text>
                  </View>
                )}
                <View style={styles.assignmentRow}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#6b7280" />
                  <Text style={styles.assignmentTextSmall}>
                    {formatDate(item.assignment.assignedDate || item.assignment.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {!isSelectionMode && (
            <View style={styles.userActions}>
              {item.assignment ? (
                <TouchableOpacity
                  style={styles.reassignButton}
                  onPress={() => {
                    setSelectedUsers(new Set([item.id]));
                    setShowAssignModal(true);
                  }}
                >
                  <MaterialCommunityIcons name="account-switch" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>REASSIGN</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={() => {
                    setSelectedUsers(new Set([item.id]));
                    setShowAssignModal(true);
                  }}
                >
                  <MaterialCommunityIcons name="account-plus" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>ASSIGN</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSingleUser(item.id, item.name)}
              >
                <MaterialCommunityIcons name="delete" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>DELETE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render activity chart
  const ActivityChart = () => {
    if (!activityData) return null;

    const maxValue = Math.max(...activityData.map(item => item.count));

    return (
      <ScrollView style={styles.chartContainer}>
        <Text style={styles.chartTitle}>User Activity (Last 7 Days)</Text>
        <View style={styles.chart}>
          {activityData.map((item, index) => (
            <View key={index} style={styles.chartBar}>
              <View
                style={[
                  styles.bar,
                  { height: (item.count / maxValue) * 100 }
                ]}
              />
              <Text style={styles.barLabel}>{item.day}</Text>
              <Text style={styles.barValue}>{item.count}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: statusBarTop + 10 }]}>
        {/* <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity> */}

        <Text style={styles.headerTitle}>User Management</Text>

        <View style={styles.headerActions}>
          {/* <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              CrossPlatformAlert.alert('Feature Coming Soon', 'Activity chart feature will be available soon.');
              // setShowActivityChart(true);
              // loadUserActivity();
            }}
          >
            <MaterialCommunityIcons name="chart-line" size={20} color="#fff" />
          </TouchableOpacity> */}

          {/* <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              CrossPlatformAlert.alert('Feature Coming Soon', 'Auto assignment feature will be available soon.');
              // setShowAutoAssignModal(true);
            }}
          >
            <MaterialCommunityIcons name="auto-fix" size={20} color="#fff" />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name, email, or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{selectedUsers.size}</Text>
          <Text style={styles.statLabel}>Selected</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Showing</Text>
        </View>
      </View>

      {/* Selection Mode Actions */}
      {isSelectionMode && (
        <View style={styles.selectionActions}>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={selectAllUsers}
          >
            <MaterialCommunityIcons name="checkbox-multiple-marked" size={20} color="#2563EB" />
            <Text style={styles.selectionButtonText}>Select All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => setShowAssignModal(true)}
            disabled={selectedUsers.size === 0}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color="#10B981" />
            <Text style={styles.selectionButtonText}>Assign</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectionButton}
            onPress={handleDeleteUsers}
            disabled={selectedUsers.size === 0}
          >
            <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
            <Text style={styles.selectionButtonText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectionButton}
            onPress={clearSelection}
          >
            <MaterialCommunityIcons name="close" size={20} color="#64748B" />
            <Text style={styles.selectionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Users List */}
      {loading && currentPage === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={isSearching ? [] : (searchQuery ? searchResults : users)}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563EB']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {isSearching ? (
                <>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.emptyText}>Searching...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="account-search" size={64} color="#CBD5E1" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No users found for your search' : 'No users available'}
                  </Text>
                </>
              )}
            </View>
          }
          onEndReached={() => {
            if (!loading && currentPage < totalPages) {
              setCurrentPage(prev => prev + 1);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}


      {/* Assign Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Assign {selectedUsers.size} User(s) to Employee
                </Text>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Employee Selection */}
                <Text style={styles.inputLabel}>Select Employee *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                    style={styles.picker}
                  >
                    <Picker.Item label="Choose an employee..." value="" />
                    {employees.length === 0 ? (
                      <Picker.Item label="No employees available" value="" enabled={false} />
                    ) : (
                      employees.map((employee) => (
                        <Picker.Item
                          key={employee.id || employee._id}
                          label={`${employee.name || employee.fullName || 'Unknown'} (${employee.email || 'No email'})`}
                          value={employee.id || employee._id}
                        />
                      ))
                    )}
                  </Picker>
                </View>

                {employees.length === 0 && (
                  <Text style={styles.warningText}>
                    ⚠️ No employees found. Please add employees first.
                  </Text>
                )}

                {/* Priority Selection */}
                <Text style={styles.inputLabel}>Priority Level *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={assignmentPriority}
                    onValueChange={setAssignmentPriority}
                    style={styles.picker}
                  >
                    <Picker.Item label="🔴 Urgent" value="urgent" />
                    <Picker.Item label="🟠 High" value="high" />
                    <Picker.Item label="🟡 Medium" value="medium" />
                    <Picker.Item label="🟢 Low" value="low" />
                  </Picker>
                </View>

                {/* Notes Input */}
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add any notes or comments about this assignment..."
                  placeholderTextColor="#94A3B8"
                  value={assignmentNotes}
                  onChangeText={setAssignmentNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.infoBox}>
                  <MaterialCommunityIcons name="information" size={16} color="#2563EB" />
                  <Text style={styles.infoText}>
                    Assigning {selectedUsers.size} user(s) to selected employee
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAssignModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmButton, assignmentLoading && styles.disabledButton]}
                  onPress={handleAssignUsers}
                  disabled={assignmentLoading}
                >
                  {assignmentLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Assign Users</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Auto Assignment Modal */}
      <Modal visible={showAutoAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Auto Assignment Settings</Text>
                <TouchableOpacity onPress={() => setShowAutoAssignModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Enable Auto Assignment</Text>
                  <Switch
                    value={autoAssignEnabled}
                    onValueChange={handleAutoAssignmentToggle}
                    trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                    thumbColor="#fff"
                  />
                </View>

                {autoAssignEnabled && (
                  <>
                    <Text style={styles.inputLabel}>Auto Assign to Employee:</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={autoAssignEmployee}
                        onValueChange={setAutoAssignEmployee}
                        style={styles.picker}
                      >
                        <Picker.Item label="Choose an employee..." value="" />
                        {employees.map((employee) => (
                          <Picker.Item
                            key={employee.id}
                            label={`${employee.name} (${employee.email})`}
                            value={employee.id}
                          />
                        ))}
                      </Picker>
                    </View>
                  </>
                )}

                <Text style={styles.helpText}>
                  When enabled, new users will be automatically assigned to the selected employee.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Chart Modal */}
      <Modal visible={showActivityChart} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>User Activity Chart</Text>
                <TouchableOpacity onPress={() => setShowActivityChart(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {activityLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading activity data...</Text>
                  </View>
                ) : (
                  <ActivityChart />
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default UserManagementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header
  header: {
    backgroundColor: '#1E293B',
   // paddingTop: Platform.OS === 'ios' ? 60 : (20 + (Platform.OS === 'android' ? 24 : 0)),
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 4,
  },

  // Stats
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Selection Actions
  selectionActions: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  selectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },

  // List
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  userInfo: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeStatus: {
    backgroundColor: '#DCFCE7',
  },
  inactiveStatus: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  userMeta: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  // Assignment Info Styles
  assignmentInfo: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  assignmentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  assignmentDetails: {
    gap: 6,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  assignmentTextSmall: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  assignButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  reassignButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pageButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
  },
  pageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth - 32,
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 8,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F9FAFB',
    minHeight: 80,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Activity Chart
  chartContainer: {
    maxHeight: 300,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingHorizontal: 10,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    backgroundColor: '#2563EB',
    marginBottom: 8,
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  barValue: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});