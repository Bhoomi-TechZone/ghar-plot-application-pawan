/**
 * Reminder Permission Management Screen
 * Admin can grant/revoke permission to senior/managers to view employee reminders
 * 
 * IMPORTANT: This is an INDIVIDUAL permission system, NOT role-based.
 * Each senior/manager has their own toggle. Only those who are given 
 * permission individually can view employee reminders.
 * 
 * - Admin: Always sees all reminders
 * - Senior/Manager WITH permission: Can see all employee reminders
 * - Senior/Manager WITHOUT permission: Can only see their own reminders
 * - Regular Employee: Can only see their own reminders (cannot get permission)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const ReminderPermissionScreen = ({ navigation }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adminToken, setAdminToken] = useState('');

  useEffect(() => {
    loadTokenAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTokenAndFetch = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (token) {
        setAdminToken(token);
        fetchEmployees(token);
      } else {
        CrossPlatformAlert.alert('Error', 'Admin authentication required');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading token:', error);
    }
  };

  const fetchEmployees = async (token = adminToken) => {
    try {
      setLoading(true);
      console.log('📋 Fetching employees for permission management...');

      const response = await fetch(`${API_BASE_URL}/admin/employees`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response Status:', response.status);

      if (response.status === 401 || response.status === 403) {
        CrossPlatformAlert.alert(
          'Session Expired',
          'Please login again.',
          [{ text: 'OK', onPress: () => navigation.navigate('AdminLogin') }]
        );
        return;
      }

      const data = await response.json();
      console.log('✅ Employees Response:', data);

      if (data.success && data.data) {
        // Filter out admin role, only show employees and seniors/managers
        const filteredEmployees = data.data
          .filter(emp => emp.role?.name !== 'Admin')
          .map(emp => ({
            ...emp,
            canViewReminders: emp.canViewReminders || false,
            isSenior: emp.role?.name === 'Senior' || emp.role?.name === 'Manager',
          }));

        setEmployees(filteredEmployees);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      if (error.message.includes('Network request failed')) {
        CrossPlatformAlert.alert('Network Error', 'Unable to connect. Please check your internet connection.');
      } else {
        CrossPlatformAlert.alert('Error', 'Failed to load employees');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const togglePermission = async (employeeId, currentStatus) => {
    const newStatus = !currentStatus;

    // Optimistic UI update
    setEmployees(prevEmployees =>
      prevEmployees.map(emp =>
        emp._id === employeeId
          ? { ...emp, canViewReminders: newStatus }
          : emp
      )
    );

    try {
      console.log(`🔄 Toggling permission for employee: ${employeeId}`);
      console.log(`📤 Setting canViewReminders: ${newStatus}`);

      const response = await fetch(
        `${API_BASE_URL}/admin/employees/${employeeId}/reminder-permission`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            canViewReminders: newStatus,
          }),
        }
      );

      const data = await response.json();
      console.log('✅ Permission update response:', data);

      if (response.ok && data.success) {
        CrossPlatformAlert.alert(
          'Success',
          `Permission ${newStatus ? 'granted' : 'revoked'} successfully!`
        );
      } else {
        throw new Error(data.message || 'Failed to update permission');
      }
    } catch (error) {
      console.error('❌ Error toggling permission:', error);

      // Revert UI on error
      setEmployees(prevEmployees =>
        prevEmployees.map(emp =>
          emp._id === employeeId
            ? { ...emp, canViewReminders: currentStatus }
            : emp
        )
      );

      CrossPlatformAlert.alert(
        'Error',
        'Failed to update permission. ' + error.message
      );
    }
  };

  const renderEmployeeCard = (employee) => {
    const canGivePermission = employee.isSenior;

    return (
      <View key={employee._id} style={styles.employeeCard}>
        <View style={styles.employeeInfo}>
          <View style={styles.employeeHeader}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            {employee.isSenior && (
              <View style={styles.seniorBadge}>
                <Icon name="verified" size={14} color="#10b981" />
                <Text style={styles.seniorBadgeText}>Senior</Text>
              </View>
            )}
          </View>

          <Text style={styles.employeeEmail}>{employee.email}</Text>
          <Text style={styles.employeeDepartment}>
            {employee.department} • {employee.role?.name || 'N/A'}
          </Text>

          {!canGivePermission && (
            <View style={styles.noteContainer}>
              <Icon name="info" size={14} color="#6b7280" />
              <Text style={styles.noteText}>
                Only Senior/Manager can view employee reminders
              </Text>
            </View>
          )}
        </View>

        <View style={styles.permissionControl}>
          <View style={styles.switchContainer}>
            <Icon
              name={employee.canViewReminders ? 'visibility' : 'visibility-off'}
              size={20}
              color={employee.canViewReminders ? '#10b981' : '#6b7280'}
            />
            <Switch
              value={employee.canViewReminders}
              onValueChange={() => togglePermission(employee._id, employee.canViewReminders)}
              disabled={!canGivePermission}
              thumbColor={employee.canViewReminders ? '#10b981' : '#f4f3f4'}
              trackColor={{ false: '#d1d5db', true: '#86efac' }}
            />
          </View>
          <Text style={styles.statusText}>
            {employee.canViewReminders ? 'Can View' : 'Cannot View'}
          </Text>
        </View>
      </View>
    );
  };

  const enabledCount = employees.filter(emp => emp.canViewReminders).length;
  const seniorCount = employees.filter(emp => emp.isSenior).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#3b82f6" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#3b82f6', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Reminder Permission</Text>
          <Text style={styles.headerSubtitle}>
            Manage who can view employee reminders
          </Text>
        </View>
      </LinearGradient>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Icon name="people" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>{seniorCount}</Text>
          <Text style={styles.statLabel}>Senior/Managers</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="check-circle" size={24} color="#10b981" />
          <Text style={styles.statValue}>{enabledCount}</Text>
          <Text style={styles.statLabel}>With Permission</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="lock" size={24} color="#6b7280" />
          <Text style={styles.statValue}>{seniorCount - enabledCount}</Text>
          <Text style={styles.statLabel}>Without Permission</Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Icon name="info-outline" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          Admin always sees all reminders. Each Senior/Manager needs individual permission. Only those with permission ON can view employee reminders.
        </Text>
      </View>

      {/* Employee List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        ) : employees.length > 0 ? (
          <View style={styles.employeeList}>
            {employees.map(renderEmployeeCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#e0e7ff',
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    marginLeft: 8,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  employeeList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  employeeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  employeeInfo: {
    flex: 1,
    marginRight: 12,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  seniorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  seniorBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 4,
  },
  employeeEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  employeeDepartment: {
    fontSize: 12,
    color: '#9ca3af',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  noteText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  permissionControl: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default ReminderPermissionScreen;

