/**
 * Admin Reminder Control Screen
 * Comprehensive management dashboard for reminder functionality across organization
 * Features: Overview Dashboard, Employee Management, Due Reminders Monitor, Popup Control
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Switch,
  ActivityIndicator,
  Dimensions,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width, height } = Dimensions.get('window');

const AdminReminderControlScreen = () => {
  const navigation = useNavigation();

  // Main Data States
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeReminders, setEmployeeReminders] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Constants
  const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

  // Authentication Helper
  const getAuthHeaders = async () => {
    const adminToken = await AsyncStorage.getItem('adminToken');
    console.log('🔑 Retrieved adminToken:', adminToken ? `${adminToken.substring(0, 20)}...` : 'NULL');

    if (!adminToken) {
      CrossPlatformAlert.alert('Error', 'Admin authentication required. Please login again.');
      navigation.goBack();
      return null;
    }
    return {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
  };

  // API Functions
  const fetchStats = async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      console.log('📊 Fetching admin reminder statistics...');
      console.log('🔗 API URL:', `${API_BASE_URL}/admin/reminders/stats`);

      const response = await fetch(`${API_BASE_URL}/admin/reminders/stats`, {
        method: 'GET',
        headers
      });

      console.log('📊 Response Status:', response.status);

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        CrossPlatformAlert.alert(
          'Session Expired',
          'Please login again to continue.',
          [{
            text: 'OK',
            onPress: () => {
              AsyncStorage.multiRemove(['adminToken', 'admin_token', 'adminData']);
              navigation.navigate('AdminLogin');
            }
          }]
        );
        return;
      }

      const data = await response.json();
      console.log('📊 Stats API Response:', data);

      if (data.success) {
        setStats(data.data);
        console.log('✅ Stats loaded:', data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        CrossPlatformAlert.alert(
          'Network Error',
          'Unable to connect to server. Please check your internet connection.',
          [{ text: 'OK' }]
        );
      } else {
        CrossPlatformAlert.alert('Error', 'Failed to fetch statistics: ' + error.message);
      }
    }
  };

  const fetchEmployees = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      console.log('📋 Fetching employees with reminder status...');
      console.log('🔗 API URL:', `${API_BASE_URL}/admin/employees`);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search })
      });

      // Try dedicated endpoint first
      let response;
      try {
        response = await fetch(
          `${API_BASE_URL}/admin/reminders/employees-status?${queryParams}`,
          { method: 'GET', headers }
        );

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          CrossPlatformAlert.alert(
            'Session Expired',
            'Please login again to continue.',
            [{
              text: 'OK',
              onPress: () => {
                AsyncStorage.multiRemove(['adminToken', 'admin_token', 'adminData']);
                navigation.navigate('AdminLogin');
              }
            }]
          );
          return;
        }
      } catch (error) {
        console.warn('⚠️ Dedicated endpoint failed, trying fallback...');
        response = await fetch(
          `${API_BASE_URL}/admin/employees?${queryParams}`,
          { method: 'GET', headers }
        );

        // Handle authentication errors on fallback
        if (response.status === 401 || response.status === 403) {
          CrossPlatformAlert.alert(
            'Session Expired',
            'Please login again to continue.',
            [{
              text: 'OK',
              onPress: () => {
                AsyncStorage.multiRemove(['adminToken', 'admin_token', 'adminData']);
                navigation.navigate('AdminLogin');
              }
            }]
          );
          return;
        }
      }

      const data = await response.json();
      console.log('✅ Employees Response:', data);

      if (data.success && data.data) {
        // Ensure adminReminderPopupEnabled exists
        const processedEmployees = data.data.map(emp => ({
          ...emp,
          adminReminderPopupEnabled: emp.adminReminderPopupEnabled ?? false,
          reminderStats: emp.reminderStats || {
            totalPending: 0,
            currentlyDue: 0,
            completed: 0,
            total: 0
          }
        }));

        setEmployees(processedEmployees);
        setPagination(data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: processedEmployees.length,
          itemsPerPage: 20
        });
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      CrossPlatformAlert.alert('Error', 'Failed to fetch employees: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDueReminders = async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      console.log('⏰ Fetching all due reminders...');

      const response = await fetch(`${API_BASE_URL}/admin/reminders/due-all`, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      console.log('✅ Due reminders response:', data);
      console.log('📊 Total due:', data.count, 'for', data.totalEmployees, 'employees');

      if (data.success) {
        const remindersData = Array.isArray(data.data) ? data.data : [];
        console.log('🔔 Due reminders loaded:', remindersData.length);
        setDueReminders(remindersData);
      }
    } catch (error) {
      console.error('❌ Error fetching due reminders:', error);
    }
  };

  const fetchEmployeeReminders = async (employeeId, status = '') => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      const queryParams = new URLSearchParams({
        page: '1',
        limit: '50',
        ...(status && { status })
      });

      const response = await fetch(
        `${API_BASE_URL}/admin/reminders/employee/${employeeId}?${queryParams}`,
        { method: 'GET', headers }
      );

      const data = await response.json();
      console.log('📋 Employee reminders response:', data);

      if (data.success) {
        setEmployeeReminders(data.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching employee reminders:', error);
      CrossPlatformAlert.alert('Error', 'Failed to fetch reminders');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployeePopup = async (employeeId, currentStatus) => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      const newStatus = !currentStatus;

      CrossPlatformAlert.alert(
        'Confirm Action',
        `${newStatus ? 'Enable' : 'Disable'} reminder popup for this employee?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                console.log('🔄 Toggling popup for employee:', employeeId);
                console.log('📤 Setting adminReminderPopupEnabled:', newStatus);

                // Update local UI immediately for better UX
                setEmployees(prev => prev.map(emp =>
                  emp._id === employeeId
                    ? { ...emp, adminReminderPopupEnabled: newStatus }
                    : emp
                ));

                // Try dedicated endpoint first (preferred)
                let updateSuccess = false;
                try {
                  const dedicatedResponse = await fetch(
                    `${API_BASE_URL}/admin/employees/${employeeId}/reminder-popup`,
                    {
                      method: 'PUT',
                      headers,
                      body: JSON.stringify({
                        adminReminderPopupEnabled: newStatus
                      })
                    }
                  );

                  if (dedicatedResponse.ok) {
                    const data = await dedicatedResponse.json();
                    if (data.success) {
                      updateSuccess = true;
                      console.log('✅ Updated via dedicated endpoint');
                    }
                  }
                } catch (dedicatedError) {
                  console.log('⚠️ Dedicated endpoint not available, trying general update...');
                }

                // Fallback to general employee update endpoint
                if (!updateSuccess) {
                  try {
                    // Fetch current employee data
                    const getResponse = await fetch(
                      `${API_BASE_URL}/admin/employees/${employeeId}`,
                      { method: 'GET', headers }
                    );

                    const getCurrentData = await getResponse.json();
                    if (getCurrentData.success) {
                      const employeeData = getCurrentData.data || getCurrentData.employee;

                      // Update with full employee data
                      const updateResponse = await fetch(
                        `${API_BASE_URL}/admin/employees/${employeeId}`,
                        {
                          method: 'PUT',
                          headers,
                          body: JSON.stringify({
                            name: employeeData.name,
                            email: employeeData.email,
                            phone: employeeData.phone,
                            department: employeeData.department,
                            role: employeeData.role?._id || employeeData.role,
                            adminReminderPopupEnabled: newStatus
                          })
                        }
                      );

                      const updateData = await updateResponse.json();
                      if (updateData.success) {
                        updateSuccess = true;
                        console.log('✅ Updated via general endpoint');
                      }
                    }
                  } catch (generalError) {
                    console.warn('⚠️ General update endpoint failed:', generalError);
                  }
                }

                if (updateSuccess) {
                  CrossPlatformAlert.alert(
                    'Success',
                    `Reminder popup ${newStatus ? 'enabled' : 'disabled'}!\n\nNote: ${newStatus ? 'Employee will now receive' : 'Employee will not receive'} reminder notifications.`
                  );
                } else {
                  // Even if API fails, keep local state (offline mode)
                  CrossPlatformAlert.alert(
                    'Saved Locally',
                    `Setting saved on device. Backend sync pending.\n\nThis feature may require backend API implementation. Contact developer if this message persists.`,
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          // Store in AsyncStorage as backup
                          AsyncStorage.setItem(
                            `employee_popup_${employeeId}`,
                            JSON.stringify({ adminReminderPopupEnabled: newStatus })
                          );
                        }
                      }
                    ]
                  );
                }
              } catch (error) {
                console.error('❌ Toggle error:', error);
                // Revert local UI on complete failure
                setEmployees(prev => prev.map(emp =>
                  emp._id === employeeId
                    ? { ...emp, adminReminderPopupEnabled: currentStatus }
                    : emp
                ));
                CrossPlatformAlert.alert('Error', 'Failed to update setting. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Toggle preparation error:', error);
      CrossPlatformAlert.alert('Error', 'Failed to prepare toggle: ' + error.message);
    }
  };

  const clearReminderCache = async () => {
    try {
      await AsyncStorage.removeItem('checkedReminders');
      CrossPlatformAlert.alert('Success', '✅ Reminder cache cleared! Restart app to see popups again.');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      CrossPlatformAlert.alert('Error', 'Failed to clear cache');
    }
  };

  // Utility Functions
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch (error) {
      return { date: 'Invalid Date', time: '' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'snoozed': return '#3b82f6';
      case 'dismissed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Effects
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        const adminToken = await AsyncStorage.getItem('adminToken');
        if (!adminToken) {
          CrossPlatformAlert.alert('Authentication Required', 'Please login as admin first');
          navigation.goBack();
          return;
        }

        console.log('🚀 Initializing Admin Reminder Control...');
        await Promise.all([
          fetchStats(),
          fetchEmployees(),
          fetchDueReminders()
        ]);

        // Set up auto-refresh for due reminders every 60 seconds
        const interval = setInterval(() => {
          fetchDueReminders();
        }, 60000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error('❌ Initialization error:', error);
        CrossPlatformAlert.alert('Error', 'Failed to initialize screen');
      }
    };

    initializeScreen();
  }, []);

  // Search effect with debounce
  useEffect(() => {
    if (activeTab === 'employees') {
      const timeoutId = setTimeout(() => {
        fetchEmployees(1, searchTerm);
        setCurrentPage(1);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, activeTab]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'overview') {
        await Promise.all([fetchStats(), fetchDueReminders()]);
      } else if (activeTab === 'employees') {
        await fetchEmployees(currentPage, searchTerm);
      } else if (activeTab === 'due-reminders') {
        await fetchDueReminders();
      }
    } catch (error) {
      console.error('❌ Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, currentPage, searchTerm]);

  // Component Renders
  const renderStatCard = ({ title, value, subtitle, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }>
      {/* Stats Cards */}
      {stats && (
        <>
          <View style={styles.statsGrid}>
            {renderStatCard({
              title: 'Total Employees',
              value: stats.employees?.total || 0,
              subtitle: `${stats.employees?.withPopupEnabled || 0} enabled`,
              icon: 'people',
              color: '#3b82f6'
            })}
            {renderStatCard({
              title: 'Total Reminders',
              value: stats.reminders?.total || 0,
              subtitle: `${stats.reminders?.pending || 0} pending`,
              icon: 'notifications',
              color: '#06b6d4'
            })}
            {renderStatCard({
              title: 'Currently Due',
              value: stats.reminders?.currentlyDue || 0,
              subtitle: 'Attention!',
              icon: 'schedule',
              color: '#f59e0b'
            })}
            {renderStatCard({
              title: 'Completed',
              value: stats.reminders?.completed || 0,
              subtitle: 'All time',
              icon: 'check-circle',
              color: '#10b981'
            })}
          </View>

          {/* Status Breakdown */}
          <View style={styles.statusBreakdown}>
            <Text style={styles.sectionTitle}>Reminders by Status</Text>
            <View style={styles.statusGrid}>
              {stats.reminders?.byStatus?.map((status, index) => (
                <View key={index} style={[styles.statusBadge, { backgroundColor: getStatusColor(status._id) + '20' }]}>
                  <Text style={[styles.statusLabel, { color: getStatusColor(status._id) }]}>
                    {status._id}: {status.count}
                  </Text>
                </View>
              )) || []}
            </View>
          </View>

          {/* Top Employees */}
          {stats.topEmployees && stats.topEmployees.length > 0 && (
            <View style={styles.topEmployees}>
              <Text style={styles.sectionTitle}>📈 Top Employees by Reminders</Text>
              {stats.topEmployees.map((emp, index) => (
                <View key={emp.employeeId} style={styles.topEmployeeItem}>
                  <View style={styles.topEmployeeRank}>
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  </View>
                  <View style={styles.topEmployeeInfo}>
                    <Text style={styles.topEmployeeName}>{emp.name}</Text>
                    <Text style={styles.topEmployeeEmail}>{emp.email}</Text>
                  </View>
                  <View style={styles.topEmployeeCount}>
                    <Text style={styles.reminderCount}>🔔 {emp.reminderCount}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderEmployeeItem = ({ item }) => (
    <View style={styles.employeeItem}>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.name}</Text>
        <Text style={styles.employeeEmail}>{item.email}</Text>
        <Text style={styles.employeeDepartment}>{item.department} • {item.role?.name || 'N/A'}</Text>
      </View>

      <View style={styles.employeeStats}>
        <Text style={styles.statText}>
          {item.reminderStats?.totalPending || 0} Pending
        </Text>
        {(item.reminderStats?.currentlyDue || 0) > 0 && (
          <Text style={[styles.statText, { color: '#ef4444' }]}>
            {item.reminderStats.currentlyDue} Due
          </Text>
        )}
      </View>

      <View style={styles.employeeActions}>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Popup</Text>
          <Switch
            value={item.adminReminderPopupEnabled}
            onValueChange={() => toggleEmployeePopup(item._id, item.adminReminderPopupEnabled)}
            thumbColor={item.adminReminderPopupEnabled ? '#10b981' : '#f4f3f4'}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
          />
        </View>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => {
            setSelectedEmployee(item);
            fetchEmployeeReminders(item._id);
            setModalVisible(true);
          }}
        >
          <Icon name="visibility" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmployeesTab = () => (
    <View style={styles.tabContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or department..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Employee List */}
      <FlatList
        data={employees}
        renderItem={renderEmployeeItem}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        }
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageButton, !pagination.hasPrev && styles.pageButtonDisabled]}
            onPress={() => {
              if (pagination.hasPrev) {
                const newPage = currentPage - 1;
                setCurrentPage(newPage);
                fetchEmployees(newPage, searchTerm);
              }
            }}
            disabled={!pagination.hasPrev}
          >
            <Text style={[styles.pageButtonText, !pagination.hasPrev && styles.pageButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <Text style={styles.pageInfo}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </Text>

          <TouchableOpacity
            style={[styles.pageButton, !pagination.hasNext && styles.pageButtonDisabled]}
            onPress={() => {
              if (pagination.hasNext) {
                const newPage = currentPage + 1;
                setCurrentPage(newPage);
                fetchEmployees(newPage, searchTerm);
              }
            }}
            disabled={!pagination.hasNext}
          >
            <Text style={[styles.pageButtonText, !pagination.hasNext && styles.pageButtonTextDisabled]}>
              Next
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderDueReminderGroup = ({ item }) => (
    <View style={styles.dueReminderGroup}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeHeaderInfo}>
          <Text style={styles.employeeHeaderName}>{item.employee.name}</Text>
          <Text style={styles.employeeHeaderEmail}>{item.employee.email} • {item.employee.department}</Text>
        </View>
        <View style={styles.dueCountBadge}>
          <Text style={styles.dueCountText}>{item.reminders.length} Due</Text>
        </View>
      </View>

      {item.reminders.map((reminder, index) => {
        const { date, time } = formatDateTime(reminder.reminderDateTime);
        const isOverdue = new Date(reminder.reminderDateTime) < new Date();

        return (
          <View key={reminder._id} style={styles.reminderCard}>
            <Text style={styles.reminderTitle}>{reminder.title}</Text>
            <Text style={[styles.reminderTime, isOverdue && styles.overdueTime]}>
              ⏰ {date} at {time}
            </Text>
            <Text style={styles.reminderComment}>{reminder.comment}</Text>
            {reminder.clientName && (
              <Text style={styles.reminderClient}>
                Client: {reminder.clientName} • {reminder.phone || 'N/A'}
                {reminder.location && ` • ${reminder.location}`}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderDueRemindersTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={dueReminders}
        renderItem={renderDueReminderGroup}
        keyExtractor={(item) => item.employee._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="check-circle" size={48} color="#10b981" />
            <Text style={styles.emptyText}>No Due Reminders</Text>
            <Text style={styles.emptySubtext}>All reminders are up to date! 🎉</Text>
          </View>
        }
      />
    </View>
  );

  const renderEmployeeReminderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {selectedEmployee?.name}'s Reminders
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterButtons}>
          {['', 'pending', 'completed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filterStatus === status && styles.filterButtonActive
              ]}
              onPress={() => {
                setFilterStatus(status);
                if (selectedEmployee) {
                  fetchEmployeeReminders(selectedEmployee._id, status);
                }
              }}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === status && styles.filterButtonTextActive
              ]}>
                {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reminders List */}
        <FlatList
          data={employeeReminders}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const { date, time } = formatDateTime(item.reminderDateTime);

            return (
              <View style={styles.modalReminderItem}>
                <View style={styles.modalReminderHeader}>
                  <Text style={styles.modalReminderTitle}>{item.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusLabel, { color: getStatusColor(item.status) }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalReminderComment}>{item.comment}</Text>
                <Text style={styles.modalReminderDateTime}>
                  {date} at {time}
                  {item.clientName && ` • ${item.clientName}`}
                </Text>
                {item.status === 'completed' && item.completionResponse && (
                  <Text style={styles.completionResponse}>
                    ✅ {item.completionResponse}
                  </Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="event-note" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No reminders found</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );

  const getTotalDueCount = () => {
    return dueReminders.reduce((total, group) => total + group.reminders.length, 0);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🔔 Admin Reminder Management</Text>
        </View>
        <View style={styles.headerRight}>
          {getTotalDueCount() > 0 && (
            <View style={styles.dueAlertBadge}>
              <Text style={styles.dueAlertText}>⚠️ {getTotalDueCount()} Due Now</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.cacheButton}
            onPress={clearReminderCache}
          >
            <Icon name="delete" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            📊 Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'employees' && styles.activeTab]}
          onPress={() => setActiveTab('employees')}
        >
          <Text style={[styles.tabText, activeTab === 'employees' && styles.activeTabText]}>
            👥 Employees ({employees.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'due-reminders' && styles.activeTab]}
          onPress={() => setActiveTab('due-reminders')}
        >
          <Text style={[styles.tabText, activeTab === 'due-reminders' && styles.activeTabText]}>
            ⏰ Due Reminders ({getTotalDueCount()})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'employees' && renderEmployeesTab()}
      {activeTab === 'due-reminders' && renderDueRemindersTab()}

      {/* Employee Reminders Modal */}
      {renderEmployeeReminderModal()}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueAlertBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  dueAlertText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  cacheButton: {
    padding: 8,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: width / 2 - 24,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBreakdown: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  topEmployees: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topEmployeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  topEmployeeRank: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  topEmployeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  topEmployeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  topEmployeeEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  topEmployeeCount: {
    alignItems: 'flex-end',
  },
  reminderCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  employeeItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeInfo: {
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  employeeEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginVertical: 2,
  },
  employeeDepartment: {
    fontSize: 12,
    color: '#9ca3af',
  },
  employeeStats: {
    marginBottom: 12,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    marginVertical: 1,
  },
  employeeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
    marginRight: 8,
  },
  viewButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  pageButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  pageButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  pageButtonTextDisabled: {
    color: '#d1d5db',
  },
  pageInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  dueReminderGroup: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  employeeHeaderInfo: {
    flex: 1,
  },
  employeeHeaderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  employeeHeaderEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  dueCountBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dueCountText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  reminderCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  overdueTime: {
    color: '#dc2626',
    fontWeight: '600',
  },
  reminderComment: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 6,
  },
  reminderClient: {
    fontSize: 11,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  filterButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  modalReminderItem: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  modalReminderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalReminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  modalReminderComment: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 6,
  },
  modalReminderDateTime: {
    fontSize: 11,
    color: '#6b7280',
  },
  completionResponse: {
    fontSize: 11,
    color: '#059669',
    marginTop: 6,
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdminReminderControlScreen;
