import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const BASE_URL = 'https://gharplotbackend.gntechnology.de';

const AdminNotificationSettings = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    if (token) {
      fetchEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('adminToken');
      if (storedToken) {
        setToken(storedToken);
      }
    } catch (error) {
      console.error('Error loading token:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/admin/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.data) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      CrossPlatformAlert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const toggleNotification = async (employeeId, currentStatus) => {
    try {
      const newStatus = !currentStatus;

      // Update UI optimistically
      setEmployees(prevEmployees =>
        prevEmployees.map(emp =>
          emp._id === employeeId
            ? { ...emp, adminReminderPopupEnabled: newStatus }
            : emp
        )
      );

      // Make API call
      const response = await axios.put(
        `${BASE_URL}/admin/reminders/employee/${employeeId}/toggle-popup`,
        { enabled: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data && response.data.success) {
        CrossPlatformAlert.alert(
          'Success',
          `Notifications ${newStatus ? 'enabled' : 'disabled'} for this employee`
        );
      } else {
        // Revert on failure
        setEmployees(prevEmployees =>
          prevEmployees.map(emp =>
            emp._id === employeeId
              ? { ...emp, adminReminderPopupEnabled: currentStatus }
              : emp
          )
        );
        CrossPlatformAlert.alert('Error', 'Failed to update notification settings');
      }
    } catch (error) {
      console.error('Error toggling notification:', error);

      // Revert on error
      setEmployees(prevEmployees =>
        prevEmployees.map(emp =>
          emp._id === employeeId
            ? { ...emp, adminReminderPopupEnabled: currentStatus }
            : emp
        )
      );

      CrossPlatformAlert.alert('Error', 'Failed to update notification settings');
    }
  };

  const renderEmployeeCard = (employee) => {
    const isEnabled = employee.adminReminderPopupEnabled || false;

    return (
      <View key={employee._id} style={styles.employeeCard}>
        <View style={styles.employeeInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
            </Text>
          </View>

          <View style={styles.employeeDetails}>
            <Text style={styles.employeeName}>{employee.name || 'Employee'}</Text>
            <Text style={styles.employeeEmail}>{employee.email || ''}</Text>
            <Text style={styles.employeeRole}>
              {employee.role?.name || 'No Role'}
            </Text>
          </View>
        </View>

        <View style={styles.switchContainer}>
          <Text style={[styles.statusText, isEnabled && styles.statusTextActive]}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </Text>
          <Switch
            value={isEnabled}
            onValueChange={() => toggleNotification(employee._id, isEnabled)}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={isEnabled ? '#3B82F6' : '#F3F4F6'}
            ios_backgroundColor="#D1D5DB"
          />
        </View>
      </View>
    );
  };

  const enabledCount = employees.filter(
    emp => emp.adminReminderPopupEnabled
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#3B82F6" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Icon
            name={refreshing ? 'hourglass' : 'refresh'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Icon name="people" size={32} color="#3B82F6" />
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total Employees</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="notifications-outline" size={32} color="#10B981" />
          <Text style={styles.statValue}>{enabledCount}</Text>
          <Text style={styles.statLabel}>Notifications On</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Icon name="information-circle" size={24} color="#3B82F6" />
        <Text style={styles.infoText}>
          Enable notifications to receive alerts when employees create reminders
        </Text>
      </View>

      {/* Employee List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : employees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        ) : (
          <View style={styles.employeeList}>
            {employees.map(renderEmployeeCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 16,
  },
  refreshButton: {
    padding: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  employeeList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  employeeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  switchContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statusTextActive: {
    color: '#10B981',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});

export default AdminNotificationSettings;

