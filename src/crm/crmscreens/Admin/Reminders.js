/**
 * Admin Reminder Dashboard Screen
 * Admin view to track employee reminder attendance
 * Monitor 10-word response rule compliance
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../../constants/theme';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const AdminReminderDashboardScreen = ({ navigation }) => {
  const [employees, setEmployees] = useState([]);
  const [reminderStats, setReminderStats] = useState({});
  const [alerts, setAlerts] = useState([]);

  // Mock data - replace with actual API calls
  const mockEmployees = [
    {
      id: 'emp_001',
      name: 'Rahul Sharma',
      role: 'Sales Executive',
      remindersEnabled: true,
      todayAttended: 8,
      todayTotal: 10,
      avgResponseWords: 15,
      poorResponseCount: 2,
    },
    {
      id: 'emp_002', 
      name: 'Priya Patel',
      role: 'Senior Executive',
      remindersEnabled: true,
      todayAttended: 12,
      todayTotal: 12,
      avgResponseWords: 22,
      poorResponseCount: 0,
    },
    {
      id: 'emp_003',
      name: 'Amit Kumar',
      role: 'Junior Executive',
      remindersEnabled: false,
      todayAttended: 0,
      todayTotal: 15,
      avgResponseWords: 8,
      poorResponseCount: 7,
    },
  ];

  const mockAlerts = [
    {
      id: 1,
      employeeId: 'emp_001',
      employeeName: 'Rahul Sharma',
      reminderId: 'rem_123',
      response: 'Ok done',
      wordCount: 2,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      type: 'insufficient_response',
    },
    {
      id: 2,
      employeeId: 'emp_003',
      employeeName: 'Amit Kumar',
      reminderId: 'rem_456',
      response: 'Yes sir',
      wordCount: 2,
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      type: 'insufficient_response',
    },
  ];

  useEffect(() => {
    setEmployees(mockEmployees);
    setAlerts(mockAlerts);
  }, []);

  const handleToggleReminders = async (employeeId, currentStatus) => {
    try {
      await toggleEmployeeReminders(employeeId, !currentStatus);
      setEmployees(employees.map(emp => 
        emp.id === employeeId 
          ? { ...emp, remindersEnabled: !currentStatus }
          : emp
      ));
    } catch (error) {
      CrossPlatformAlert.alert('Error', 'Failed to update reminder settings');
    }
  };

  const getAttendanceColor = (attended, total) => {
    const percentage = (attended / total) * 100;
    if (percentage >= 90) return '#52C41A';
    if (percentage >= 70) return '#FA8C16';
    return '#FF4D4F';
  };

  const getResponseQualityColor = (avgWords) => {
    if (avgWords >= 15) return '#52C41A';
    if (avgWords >= 10) return '#FA8C16';
    return '#FF4D4F';
  };

  const renderEmployeeCard = ({ item }) => {
    const attendancePercentage = item.todayTotal > 0 
      ? Math.round((item.todayAttended / item.todayTotal) * 100)
      : 0;

    return (
      <View style={styles.employeeCard}>
        {/* Header */}
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{item.name}</Text>
            <Text style={styles.employeeRole}>{item.role}</Text>
          </View>
          
          <View style={styles.reminderToggle}>
            <Text style={styles.toggleLabel}>Reminders</Text>
            <Switch
              value={item.remindersEnabled}
              onValueChange={() => handleToggleReminders(item.id, item.remindersEnabled)}
              trackColor={{ false: '#E0E0E0', true: theme.colors.primary + '40' }}
              thumbColor={item.remindersEnabled ? theme.colors.primary : '#F4F3F4'}
            />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {/* Attendance */}
          <View style={styles.statItem}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons 
                name="clipboard-check" 
                size={16} 
                color={getAttendanceColor(item.todayAttended, item.todayTotal)} 
              />
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
            <Text style={[styles.statValue, { color: getAttendanceColor(item.todayAttended, item.todayTotal) }]}>
              {item.todayAttended}/{item.todayTotal}
            </Text>
            <Text style={styles.statSubtext}>{attendancePercentage}%</Text>
          </View>

          {/* Response Quality */}
          <View style={styles.statItem}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons 
                name="message-text" 
                size={16} 
                color={getResponseQualityColor(item.avgResponseWords)} 
              />
              <Text style={styles.statLabel}>Avg Words</Text>
            </View>
            <Text style={[styles.statValue, { color: getResponseQualityColor(item.avgResponseWords) }]}>
              {item.avgResponseWords}
            </Text>
            <Text style={styles.statSubtext}>words/response</Text>
          </View>

          {/* Poor Responses */}
          <View style={styles.statItem}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons 
                name="alert" 
                size={16} 
                color={item.poorResponseCount > 0 ? '#FF4D4F' : '#52C41A'} 
              />
              <Text style={styles.statLabel}>Alerts</Text>
            </View>
            <Text style={[styles.statValue, { color: item.poorResponseCount > 0 ? '#FF4D4F' : '#52C41A' }]}>
              {item.poorResponseCount}
            </Text>
            <Text style={styles.statSubtext}>poor responses</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => {/* navigation.navigate('EmployeeDetail', { employeeId: item.id }) */}}
          >
            <MaterialCommunityIcons name="eye" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.reportButton]}
            onPress={() => {/* navigation.navigate('EmployeeReport', { employeeId: item.id }) */}}
          >
            <MaterialCommunityIcons name="chart-line" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAlertItem = ({ item }) => {
    const timeAgo = Math.round((new Date() - new Date(item.timestamp)) / (1000 * 60));
    
    return (
      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <MaterialCommunityIcons name="alert-circle" size={20} color="#FF4D4F" />
          <Text style={styles.alertTitle}>Insufficient Response</Text>
          <Text style={styles.alertTime}>{timeAgo}m ago</Text>
        </View>
        
        <Text style={styles.alertEmployee}>{item.employeeName}</Text>
        
        <View style={styles.alertContent}>
          <Text style={styles.alertLabel}>Response ({item.wordCount} words):</Text>
          <Text style={styles.alertResponse}>"{item.response}"</Text>
        </View>
        
        <View style={styles.alertActions}>
          <TouchableOpacity style={styles.alertActionButton}>
            <MaterialCommunityIcons name="message" size={14} color={theme.colors.primary} />
            <Text style={styles.alertActionText}>Contact Employee</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.alertActionButton}>
            <MaterialCommunityIcons name="check" size={14} color="#52C41A" />
            <Text style={[styles.alertActionText, { color: '#52C41A' }]}>Mark Resolved</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSummaryStats = () => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.remindersEnabled).length;
    const totalAlerts = alerts.length;
    const avgAttendance = employees.reduce((acc, emp) => {
      const rate = emp.todayTotal > 0 ? (emp.todayAttended / emp.todayTotal) : 0;
      return acc + rate;
    }, 0) / totalEmployees * 100;

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Today's Summary</Text>
        
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.primary + '10' }]}>
            <MaterialCommunityIcons name="account-group" size={24} color={theme.colors.primary} />
            <Text style={styles.summaryValue}>{activeEmployees}/{totalEmployees}</Text>
            <Text style={styles.summaryLabel}>Active Employees</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: '#52C41A10' }]}>
            <MaterialCommunityIcons name="chart-line" size={24} color="#52C41A" />
            <Text style={styles.summaryValue}>{Math.round(avgAttendance)}%</Text>
            <Text style={styles.summaryLabel}>Avg Attendance</Text>
          </View>
          
          <View style={[styles.summaryCard, { backgroundColor: '#FF4D4F10' }]}>
            <MaterialCommunityIcons name="alert" size={24} color="#FF4D4F" />
            <Text style={styles.summaryValue}>{totalAlerts}</Text>
            <Text style={styles.summaryLabel}>Active Alerts</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Reminder Dashboard</Text>
        <TouchableOpacity onPress={() => {/* navigation.navigate('Settings') */}}>
          <MaterialCommunityIcons name="cog" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Stats */}
        {renderSummaryStats()}

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🚨 Active Alerts</Text>
              <TouchableOpacity>
                <Text style={styles.sectionAction}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={alerts}
              renderItem={renderAlertItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.alertsList}
            />
          </View>
        )}

        {/* Employee List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 Employee Performance</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>Export Report</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={employees}
            renderItem={renderEmployeeCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.employeesList}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  sectionAction: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  alertsList: {
    paddingHorizontal: 16,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4D4F',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4D4F',
    marginLeft: 8,
    flex: 1,
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  alertEmployee: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  alertContent: {
    marginBottom: 12,
  },
  alertLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  alertResponse: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontStyle: 'italic',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 6,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 12,
  },
  alertActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  alertActionText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  employeesList: {
    paddingHorizontal: 16,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 14,
    color: '#666',
  },
  reminderToggle: {
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 10,
    color: '#999',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  viewButton: {
    backgroundColor: theme.colors.primary,
  },
  reportButton: {
    backgroundColor: '#722ED1',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AdminReminderDashboardScreen;