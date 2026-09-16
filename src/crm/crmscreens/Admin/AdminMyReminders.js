import React, { useState, useEffect, useCallback } from 'react';
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
  Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const AdminMyReminders = ({ navigation }) => {
  // Main Data States
  const [stats, setStats] = useState({
    employees: { total: 0, withPopupEnabled: 0 },
    reminders: { total: 0, pending: 0, currentlyDue: 0, completed: 0, byStatus: [] },
    topEmployees: []
  });
  const [employees, setEmployees] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);
  const [employeeReminders, setEmployeeReminders] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // UI States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | employees | due-reminders

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // For employee modal

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });

  // Polling interval ref
  const [pollingInterval, setPollingInterval] = useState(null);

  // Fetch Statistics
  const fetchStats = async () => {
    try {
      // Prioritize adminToken for admin features (like web version)
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      let token = adminToken || employeeToken;

      if (!token) {
        console.error('❌ No token found for stats fetch');
        // Set fallback stats instead of throwing error
        setStats({
          employees: { total: 0, withPopupEnabled: 0 },
          reminders: { total: 0, pending: 0, currentlyDue: 0, completed: 0, byStatus: [] },
          topEmployees: []
        });
        return;
      }

      console.log('📊 Fetching admin reminder stats...');
      if (adminToken) {
        console.log('🔑 Using admin token');
      } else {
        console.log('⚠️ Using employee token as fallback');
      }

      const response = await axios.get(`${API_BASE_URL}/admin/reminders/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout (longer than web for mobile)
      });

      console.log('📊 Stats API Response:', response.data);

      if (response.data.success && response.data.data) {
        console.log('✅ Stats loaded:', response.data.data);
        setStats(response.data.data);
      } else {
        console.warn('⚠️ Stats API returned success:false', response.data.message);
        // Set fallback data when API returns success: false
        setStats({
          employees: { total: 0, withPopupEnabled: 0 },
          reminders: { total: 0, pending: 0, currentlyDue: 0, completed: 0, byStatus: [] },
          topEmployees: []
        });
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error.message);
      console.error('📛 Error details:', error.response?.data);

      // Always set fallback data instead of showing error
      setStats({
        employees: { total: employees.length || 0, withPopupEnabled: 0 },
        reminders: { total: 0, pending: 0, currentlyDue: dueReminders.length || 0, completed: 0, byStatus: [] },
        topEmployees: []
      });

      // Only alert for non-network errors
      if (!error.message.includes('timeout') && !error.message.includes('Network Error')) {
        console.warn('Non-critical stats error:', error.response?.data?.message || error.message);
      }
    }
  };

  // Fetch Employees with Reminder Status
  const fetchEmployees = async (page = 1, search = '') => {
    try {
      setLoading(true);
      let token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        // Try employeeToken as fallback but prefer adminToken for admin features
        token = await AsyncStorage.getItem('employeeToken');
      }

      if (!token) {
        console.error('❌ No token found for employees fetch');
        setLoading(false);
        return;
      }

      console.log('📋 Fetching employees with reminder status...');
      console.log('🔍 Page:', page, 'Search:', search);
      console.log('🔑 Token preview:', token.substring(0, 30) + '...');

      let employeeData = [];

      // Try dedicated endpoint first (exactly like web version)
      try {
        console.log('🔍 Trying endpoint: /admin/reminders/employees-status');
        const response = await axios.get(`${API_BASE_URL}/admin/reminders/employees-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: { page, limit: 20, search },
          timeout: 15000
        });

        console.log('✅ employees-status Response:', response.data);

        if (response.data.success && response.data.data && response.data.data.length > 0) {
          employeeData = response.data.data;
          console.log('👥 Loaded from reminder endpoint:', employeeData.length);

          setEmployees(employeeData);
          setPagination(response.data.pagination || {
            currentPage: page,
            totalPages: 1,
            totalItems: employeeData.length,
            itemsPerPage: 20
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('⚠️ Reminder endpoint failed, using fallback:', err.message);
      }

      // Fallback to regular employee endpoint (exactly like web version)
      console.log('🔄 Trying fallback: /admin/employees');
      const fallbackResponse = await axios.get(`${API_BASE_URL}/admin/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { page, limit: 100, search },
        timeout: 15000
      });

      console.log('✅ Regular employees Response:', fallbackResponse.data);

      if (fallbackResponse.data.success) {
        employeeData = Array.isArray(fallbackResponse.data.data)
          ? fallbackResponse.data.data
          : (fallbackResponse.data.employees || []);

        console.log('👥 Loaded from employee endpoint:', employeeData.length);

        // Manually set adminReminderPopupEnabled to false if not present (like web version)
        employeeData = employeeData.map(emp => ({
          ...emp,
          adminReminderPopupEnabled: emp.adminReminderPopupEnabled || false,
          reminderStats: emp.reminderStats || {
            totalPending: 0,
            currentlyDue: 0
          }
        }));

        setEmployees(employeeData);
        setPagination({
          currentPage: page,
          totalPages: Math.ceil(employeeData.length / 20),
          totalItems: employeeData.length,
          itemsPerPage: 20
        });
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error.message);
      console.error('📛 Error details:', error.response?.data);
      CrossPlatformAlert.alert('Error Loading Employees', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Due Reminders
  const fetchDueReminders = async () => {
    try {
      // Prioritize adminToken for admin features (like web version)
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');
      let token = adminToken || employeeToken;

      if (!token) {
        console.error('❌ No token found for due reminders fetch');
        // Set empty array instead of return
        setDueReminders([]);
        return;
      }

      console.log('⏰ Fetching all due reminders...');
      if (adminToken) {
        console.log('🔑 Using admin token for due reminders');
      } else {
        console.log('⚠️ Using employee token as fallback');
      }

      const response = await axios.get(`${API_BASE_URL}/admin/reminders/due-all`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      });

      console.log('✅ Due reminders response:', response.data);

      let finalDueReminders = [];
      if (response.data.success) {
        finalDueReminders = Array.isArray(response.data.data) ? response.data.data : [];
        console.log('🔔 Due reminders loaded:', finalDueReminders.length, 'groups');
      }

      // 🚀 NEW: Load local reminders from AsyncStorage (synced with ReminderModal.js)
      let localRemindersList = [];
      try {
        const localData = await AsyncStorage.getItem('localReminders');
        if (localData) {
          localRemindersList = JSON.parse(localData);
          console.log('📱 Loaded', localRemindersList.length, 'reminders from local storage');
        }
      } catch (localError) {
        console.error('❌ Error loading local reminders:', localError);
      }

      // Merge logic for AdminMyReminders (groups by employee, but we can add local ones as a special group or individual items)
      // For now, let's just make sure they appear.
      // Since AdminMyReminders uses a nested structure (Employee -> Reminders), 
      // we'll create a "My Local Reminders" entry if there are local ones.

      if (localRemindersList.length > 0) {
        const localGroup = {
          _id: 'local_group',
          employeeName: 'My Local Reminders',
          employeeId: 'local',
          isLocal: true,
          reminders: localRemindersList.map(r => ({
            ...r,
            _id: r.id || r._id,
            source: 'local',
            status: r.status || 'pending'
          }))
        };
        finalDueReminders = [localGroup, ...finalDueReminders];
      }

      setDueReminders(finalDueReminders);

    } catch (error) {
      console.error('❌ Error fetching due reminders:', error.message);
      console.error('📛 Error details:', error.response?.data);

      // Even on error, try to show local reminders
      try {
        const localData = await AsyncStorage.getItem('localReminders');
        if (localData) {
          const localRemindersList = JSON.parse(localData);
          if (localRemindersList.length > 0) {
            const localGroup = {
              _id: 'local_group',
              employeeName: 'My Local Reminders',
              employeeId: 'local',
              isLocal: true,
              reminders: localRemindersList.map(r => ({
                ...r,
                _id: r.id || r._id,
                source: 'local',
                status: r.status || 'pending'
              }))
            };
            setDueReminders([localGroup]);
            return;
          }
        }
      } catch (e) {}

      setDueReminders([]);
    }
  };

  // Fetch Employee Reminders
  const fetchEmployeeReminders = async (employeeId, status = '') => {
    try {
      setLoading(true);
      const adminToken = await AsyncStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE_URL}/admin/reminders/employee/${employeeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        params: { status, page: 1, limit: 50 }
      });

      if (response.data.success) {
        setEmployeeReminders(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employee reminders:', error);
      CrossPlatformAlert.alert('Error', 'Failed to fetch reminders');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Employee Popup
  const toggleEmployeePopup = async (employeeId, currentStatus) => {
    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const newStatus = !currentStatus;

      // Get current employee data
      const getRes = await axios.get(
        `${API_BASE_URL}/admin/employees/${employeeId}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (!getRes.data.success) {
        throw new Error('Failed to fetch employee');
      }

      const employeeData = getRes.data.data || getRes.data.employee;

      // Update employee
      const response = await axios.put(
        `${API_BASE_URL}/admin/employees/${employeeId}`,
        {
          name: employeeData.name,
          email: employeeData.email,
          phone: employeeData.phone,
          department: employeeData.department,
          role: employeeData.role?._id || employeeData.role,
          adminReminderPopupEnabled: newStatus
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Update UI
        setEmployees(prev => prev.map(emp =>
          emp._id === employeeId
            ? { ...emp, adminReminderPopupEnabled: newStatus }
            : emp
        ));

        CrossPlatformAlert.alert('Success', `Admin popup ${newStatus ? 'enabled' : 'disabled'}!`);

        // Verify after 1 second
        setTimeout(async () => {
          try {
            const verifyRes = await axios.get(
              `${API_BASE_URL}/admin/employees/${employeeId}`,
              { headers: { Authorization: `Bearer ${adminToken}` } }
            );
            const verified = verifyRes.data.data?.adminReminderPopupEnabled;

            if (verified !== newStatus) {
              CrossPlatformAlert.alert('Warning', 'Setting may not have saved. Contact backend developer.');
            }
          } catch (err) {
            console.error('Verification error:', err);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error toggling popup:', error);
      CrossPlatformAlert.alert('Error', error.response?.data?.message || error.message);
      fetchEmployees(currentPage, searchTerm);
    }
  };

  // Clear Cache
  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem('checkedReminders');
      CrossPlatformAlert.alert('Success', 'Reminder cache cleared! Restart app to see popups again.');
      console.log('🗑️ Cleared checkedReminders from AsyncStorage');
    } catch (error) {
      console.error('Error clearing cache:', error);
      CrossPlatformAlert.alert('Error', 'Failed to clear cache');
    }
  };

  // Format Date/Time
  const formatDateTime = (dateString) => {
    if (!dateString) return { date: 'No Date', time: 'No Time' };

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Invalid date string:', dateString);
        return { date: 'Invalid Date', time: 'Invalid Time' };
      }

      const dateStr = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return { date: dateStr, time: timeStr };
    } catch (error) {
      console.error('❌ Error formatting date:', error.message);
      return { date: 'Error', time: 'Error' };
    }
  };

  // Calculate total due count
  const totalDueCount = dueReminders.reduce((acc, item) => acc + (item.reminders?.length || 0), 0);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      console.log('🚀 AdminMyReminders initializing...');

      // Prioritize adminToken for admin features (like web version)
      const adminToken = await AsyncStorage.getItem('adminToken');
      const employeeToken = await AsyncStorage.getItem('employeeToken');

      console.log('🔑 Admin Token:', adminToken ? 'Found ✅' : 'Missing ❌');
      console.log('🔑 Employee Token:', employeeToken ? 'Found ✅' : 'Missing ❌');

      let token = adminToken || employeeToken;

      if (!token) {
        console.error('❌ No token found - cannot initialize');
        CrossPlatformAlert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      if (adminToken) {
        console.log('🔑 Using admin token for admin features');
        console.log('🔑 Admin token preview:', adminToken.substring(0, 30) + '...');
      } else {
        console.log('⚠️ Using employee token as fallback (may have limited access)');
        console.log('🔑 Employee token preview:', employeeToken.substring(0, 30) + '...');
      }

      try {
        setLoading(true);

        console.log('1️⃣ Fetching stats...');
        await fetchStats();

        console.log('2️⃣ Fetching employees with reminder status...');
        await fetchEmployees(1, '');

        console.log('3️⃣ Fetching all due reminders...');
        await fetchDueReminders();

        console.log('✅ All data loaded successfully');

        // Start polling for due reminders every 1 minute (like web version)
        const interval = setInterval(() => {
          console.log('🔄 Polling for due reminders...');
          fetchDueReminders();
        }, 60000);

        setPollingInterval(interval);
      } catch (error) {
        console.error('❌ Error during initialization:', error.message);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // Refresh when coming back to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 AdminMyReminders focused - refreshing...');
      fetchStats();
      fetchEmployees(currentPage, searchTerm);
      fetchDueReminders();
    });
    return unsubscribe;
  }, [navigation, currentPage, searchTerm]);

  // Search debounce
  useEffect(() => {
    if (activeTab === 'employees') {
      const timer = setTimeout(() => {
        fetchEmployees(1, searchTerm);
        setCurrentPage(1);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchTerm, activeTab]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchEmployees(currentPage, searchTerm),
      fetchDueReminders(),
    ]);
    setRefreshing(false);
  }, [currentPage, searchTerm]);

  // Render Statistics Card
  const renderStatCard = (title, value, subtitle, icon, color) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={32} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  // Render Overview Tab
  const renderOverviewTab = () => {
    // Show loading only during initial load
    if (loading && (!stats || stats.employees.total === 0)) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {/* Statistics Cards */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Employees',
            stats.employees?.total || 0,
            `${stats.employees?.withPopupEnabled || 0} with popup enabled`,
            'people',
            '#6366f1'
          )}
          {renderStatCard(
            'Total Reminders',
            stats.reminders?.total || 0,
            `${stats.reminders?.pending || 0} pending`,
            'notifications',
            '#06b6d4'
          )}
          {renderStatCard(
            'Currently Due',
            stats.reminders?.currentlyDue || 0,
            'Requires attention',
            'alarm',
            '#f59e0b'
          )}
          {renderStatCard(
            'Completed',
            stats.reminders?.completed || 0,
            'All time',
            'check-circle',
            '#10b981'
          )}
        </View>

        {/* Status Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders by Status</Text>
          <View style={styles.statusGrid}>
            {stats.reminders?.byStatus?.map((status, index) => (
              <View key={index} style={styles.statusBadge}>
                <Text style={styles.statusName}>{status._id}</Text>
                <Text style={styles.statusCount}>{status.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Employees */}
        {stats.topEmployees && stats.topEmployees.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Top Employees by Reminders</Text>
            {stats.topEmployees.map((emp, index) => (
              <View key={emp.employeeId} style={styles.topEmployeeCard}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topEmployeeInfo}>
                  <Text style={styles.topEmployeeName}>{emp.name}</Text>
                  <Text style={styles.topEmployeeEmail}>{emp.email}</Text>
                </View>
                <View style={styles.reminderCountBadge}>
                  <Icon name="notifications" size={16} color="#6366f1" />
                  <Text style={styles.reminderCountText}>{emp.reminderCount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Render Employees Tab
  const renderEmployeesTab = () => (
    <View style={styles.tabContent}>
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or department..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Employees List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="person-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateTitle}>No employees found</Text>
          <Text style={styles.emptyStateText}>Try adjusting your search</Text>
        </View>
      ) : (
        <>
          {employees.map(employee => (
            <View key={employee._id} style={styles.employeeCard}>
              <View style={styles.employeeHeader}>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{employee.name}</Text>
                  <Text style={styles.employeeEmail}>{employee.email}</Text>
                  {employee.phone && (
                    <Text style={styles.employeePhone}>{employee.phone}</Text>
                  )}
                </View>
              </View>

              <View style={styles.employeeDetails}>
                <View style={styles.detailRow}>
                  <Icon name="business" size={16} color="#6b7280" />
                  <Text style={styles.detailLabel}>Department:</Text>
                  <Text style={styles.detailValue}>{employee.department || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="work" size={16} color="#6b7280" />
                  <Text style={styles.detailLabel}>Role:</Text>
                  <Text style={styles.detailValue}>
                    {employee.role?.name || employee.role || 'N/A'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="notifications" size={16} color="#6b7280" />
                  <Text style={styles.detailLabel}>Reminders:</Text>
                  <View style={styles.reminderBadges}>
                    {employee.reminderStats?.totalPending > 0 && (
                      <View style={[styles.reminderBadge, styles.pendingBadge]}>
                        <Text style={styles.reminderBadgeText}>
                          {employee.reminderStats.totalPending} Pending
                        </Text>
                      </View>
                    )}
                    {employee.reminderStats?.currentlyDue > 0 && (
                      <View style={[styles.reminderBadge, styles.dueBadge]}>
                        <Text style={styles.reminderBadgeText}>
                          {employee.reminderStats.currentlyDue} Due
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="bell-ring" size={16} color="#6b7280" />
                  <Text style={styles.detailLabel}>Admin Popup:</Text>
                  <Switch
                    value={employee.adminReminderPopupEnabled}
                    onValueChange={() => toggleEmployeePopup(employee._id, employee.adminReminderPopupEnabled)}
                    trackColor={{ false: '#d1d5db', true: '#10b981' }}
                    thumbColor={employee.adminReminderPopupEnabled ? '#fff' : '#f3f4f6'}
                  />
                  <Text style={[
                    styles.toggleLabel,
                    employee.adminReminderPopupEnabled && styles.toggleLabelActive
                  ]}>
                    {employee.adminReminderPopupEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => {
                  setSelectedEmployee(employee);
                  fetchEmployeeReminders(employee._id);
                }}
              >
                <Icon name="visibility" size={20} color="#6366f1" />
                <Text style={styles.viewButtonText}>View Reminders</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                    fetchEmployees(currentPage - 1, searchTerm);
                  }
                }}
                disabled={currentPage === 1}
              >
                <Icon name="chevron-left" size={24} color={currentPage === 1 ? '#d1d5db' : '#6366f1'} />
              </TouchableOpacity>

              <Text style={styles.paginationText}>
                Page {pagination.currentPage} of {pagination.totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.paginationButton, currentPage === pagination.totalPages && styles.paginationButtonDisabled]}
                onPress={() => {
                  if (currentPage < pagination.totalPages) {
                    setCurrentPage(currentPage + 1);
                    fetchEmployees(currentPage + 1, searchTerm);
                  }
                }}
                disabled={currentPage === pagination.totalPages}
              >
                <Icon name="chevron-right" size={24} color={currentPage === pagination.totalPages ? '#d1d5db' : '#6366f1'} />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );

  // Render Due Reminders Tab
  const renderDueRemindersTab = () => (
    <View style={styles.tabContent}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading due reminders...</Text>
        </View>
      ) : dueReminders.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="check-circle" size={64} color="#10b981" />
          <Text style={styles.emptyStateTitle}>No Due Reminders</Text>
          <Text style={styles.emptyStateText}>
            {totalDueCount > 0 ?
              `${totalDueCount} reminders found but none are currently due` :
              'All reminders are up to date!'
            }
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              console.log('🔄 Manual refresh triggered');
              fetchDueReminders();
            }}
          >
            <Icon name="refresh" size={20} color="#6366f1" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Debug Info */}
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              📊 Loaded {dueReminders.length} reminder groups, Total due: {totalDueCount}
            </Text>
          </View>

          {dueReminders.map((item, index) => (
            <View key={index} style={styles.dueEmployeeGroup}>
              <View style={styles.dueEmployeeHeader}>
                <View>
                  <Text style={styles.dueEmployeeName}>{item.employee?.name}</Text>
                  <Text style={styles.dueEmployeeInfo}>
                    {item.employee?.email} • {item.employee?.department}
                  </Text>
                </View>
                <View style={styles.dueCountBadge}>
                  <Text style={styles.dueCountText}>{item.reminders?.length || 0} Due</Text>
                </View>
              </View>

              {item.reminders?.map((reminder, rIndex) => {
                const { date, time } = formatDateTime(reminder.reminderDateTime);

                // Debug log for each reminder
                console.log(`🔔 Reminder ${rIndex + 1}:`, {
                  title: reminder.title,
                  note: reminder.note,
                  dateTime: reminder.reminderDateTime,
                  status: reminder.status,
                  clientName: reminder.clientName
                });

                return (
                  <View key={rIndex} style={styles.reminderCard}>
                    {/* Status Badge - Top Right */}
                    <View style={[styles.statusBadge, {
                      backgroundColor: reminder.status === 'completed' ? '#d1fae5' :
                        reminder.status === 'dismissed' ? '#fee2e2' : '#fef3c7'
                    }]}>
                      <Text style={[styles.statusBadgeText, {
                        color: reminder.status === 'completed' ? '#065f46' :
                          reminder.status === 'dismissed' ? '#991b1b' : '#92400e'
                      }]}>
                        {reminder.status === 'completed' ? '✓ Done' :
                          reminder.status === 'dismissed' ? '✕ Dismissed' : '⏰ Pending'}
                      </Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.reminderTitle}>
                      {reminder.title || reminder.note || 'Follow up reminder'}
                    </Text>

                    {/* Date & Time */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Icon name="event" size={16} color="#6366f1" />
                      <Text style={styles.reminderTime}> {date} at {time}</Text>
                    </View>

                    {/* Comment/Note Box */}
                    {(reminder.comment || reminder.note) && (
                      <View style={styles.reminderCommentBox}>
                        <Icon name="chat-bubble-outline" size={14} color="#6366f1" />
                        <Text style={styles.reminderComment}>{reminder.comment || reminder.note}</Text>
                      </View>
                    )}

                    {/* Client Information */}
                    {reminder.clientName && (
                      <View style={styles.clientInfo}>
                        <Icon name="person" size={14} color="#6b7280" />
                        <Text style={styles.clientInfoText}>
                          {reminder.clientName}
                          {reminder.phone && ` • ${reminder.phone}`}
                        </Text>
                      </View>
                    )}

                    {/* Location */}
                    {reminder.location && (
                      <View style={styles.clientInfo}>
                        <Icon name="location-on" size={14} color="#6b7280" />
                        <Text style={styles.clientInfoText}>{reminder.location}</Text>
                      </View>
                    )}

                    {/* Property Type */}
                    {reminder.propertyType && (
                      <View style={styles.clientInfo}>
                        <Icon name="home" size={14} color="#6b7280" />
                        <Text style={styles.clientInfoText}>{reminder.propertyType}</Text>
                      </View>
                    )}

                    {/* Meta Information */}
                    <View style={styles.reminderMeta}>
                      <Text style={styles.reminderMetaText}>
                        {reminder.assignmentType && `Type: ${reminder.assignmentType}`}
                        {reminder.assignmentType && reminder.createdAt && ' • '}
                        {reminder.createdAt && `Created: ${new Date(reminder.createdAt).toLocaleDateString('en-IN')}`}
                      </Text>
                      {reminder.createdBy && (
                        <Text style={styles.reminderMetaText}>
                          Set by: {reminder.createdBy.fullName || reminder.createdBy.name || 'Unknown'}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </>
      )}
    </View>
  );

  // Render Employee Reminders Modal
  const renderEmployeeModal = () => {
    if (!selectedEmployee) return null;

    return (
      <Modal
        visible={!!selectedEmployee}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedEmployee(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEmployee.name}'s Reminders</Text>
              <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Filter Buttons */}
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, filterStatus === '' && styles.filterButtonActive]}
                onPress={() => {
                  setFilterStatus('');
                  fetchEmployeeReminders(selectedEmployee._id, '');
                }}
              >
                <Text style={[styles.filterButtonText, filterStatus === '' && styles.filterButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterStatus === 'pending' && styles.filterButtonActive]}
                onPress={() => {
                  setFilterStatus('pending');
                  fetchEmployeeReminders(selectedEmployee._id, 'pending');
                }}
              >
                <Text style={[styles.filterButtonText, filterStatus === 'pending' && styles.filterButtonTextActive]}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterStatus === 'completed' && styles.filterButtonActive]}
                onPress={() => {
                  setFilterStatus('completed');
                  fetchEmployeeReminders(selectedEmployee._id, 'completed');
                }}
              >
                <Text style={[styles.filterButtonText, filterStatus === 'completed' && styles.filterButtonTextActive]}>
                  Completed
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loading ? (
                <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 20 }} />
              ) : employeeReminders.length === 0 ? (
                <Text style={styles.noRemindersText}>No reminders found</Text>
              ) : (
                employeeReminders.map((reminder, index) => {
                  const { date, time } = formatDateTime(reminder.reminderDateTime);
                  return (
                    <View key={index} style={styles.modalReminderCard}>
                      <View style={styles.modalReminderHeader}>
                        <Text style={styles.modalReminderTitle}>{reminder.title}</Text>
                        <View style={[
                          styles.statusBadgeSmall,
                          reminder.status === 'completed' && styles.statusBadgeCompleted,
                          reminder.status === 'pending' && styles.statusBadgePending,
                          reminder.status === 'snoozed' && styles.statusBadgeSnoozed,
                        ]}>
                          <Text style={styles.statusBadgeSmallText}>{reminder.status}</Text>
                        </View>
                      </View>
                      {reminder.comment && (
                        <Text style={styles.modalReminderComment}>{reminder.comment}</Text>
                      )}
                      <Text style={styles.modalReminderTime}>
                        {date} at {time}
                        {reminder.clientName && ` • ${reminder.clientName}`}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#4f46e5']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Icon name="notifications-active" size={28} color="#fff" />
            <Text style={styles.headerTitle}>Admin Reminder Management</Text>
          </View>
          <View style={styles.headerActions}>
            {totalDueCount > 0 && (
              <View style={styles.dueNowBadge}>
                <Icon name="alarm" size={16} color="#fff" />
                <Text style={styles.dueNowText}>{totalDueCount} Due Now</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.clearCacheButton}
              onPress={clearCache}
            >
              <Icon name="refresh" size={16} color="#fff" />
              <Text style={styles.clearCacheText}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Icon name="dashboard" size={20} color={activeTab === 'overview' ? '#6366f1' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'employees' && styles.tabActive]}
          onPress={() => setActiveTab('employees')}
        >
          <Icon name="people" size={20} color={activeTab === 'employees' ? '#6366f1' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'employees' && styles.tabTextActive]}>
            Employees ({employees.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'due-reminders' && styles.tabActive]}
          onPress={() => setActiveTab('due-reminders')}
        >
          <Icon name="alarm" size={20} color={activeTab === 'due-reminders' ? '#6366f1' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'due-reminders' && styles.tabTextActive]}>
            Due ({totalDueCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'employees' && renderEmployeesTab()}
        {activeTab === 'due-reminders' && renderDueRemindersTab()}
      </ScrollView>

      {/* Employee Reminders Modal */}
      {renderEmployeeModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  headerContent: {
    marginTop: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dueNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  dueNowText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  clearCacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  clearCacheText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  statusCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  topEmployeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  topEmployeeInfo: {
    flex: 1,
  },
  topEmployeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  topEmployeeEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  reminderCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
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
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  employeePhone: {
    fontSize: 12,
    color: '#9ca3af',
  },
  employeeDetails: {
    gap: 10,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    color: '#1f2937',
    flex: 1,
  },
  reminderBadges: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  reminderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  dueBadge: {
    backgroundColor: '#fee2e2',
  },
  reminderBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleLabelActive: {
    color: '#10b981',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingVertical: 12,
  },
  paginationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dueEmployeeGroup: {
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
  dueEmployeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dueEmployeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  dueEmployeeInfo: {
    fontSize: 12,
    color: '#6b7280',
  },
  dueCountBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dueCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  reminderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'relative',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    elevation: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    paddingRight: 100, // Make space for status badge
    lineHeight: 20,
  },
  reminderTime: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  reminderCommentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 8,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  reminderComment: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 19,
    flex: 1,
    fontStyle: 'italic',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  clientInfoText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  reminderMeta: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 4,
  },
  reminderMetaText: {
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 16,
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
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  noRemindersText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 32,
  },
  modalReminderCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  modalReminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalReminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeCompleted: {
    backgroundColor: '#d1fae5',
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeSnoozed: {
    backgroundColor: '#dbeafe',
  },
  statusBadgeSmallText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  modalReminderComment: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 18,
  },
  modalReminderTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  debugInfo: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#0369a1',
    fontFamily: 'monospace',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminMyReminders;
