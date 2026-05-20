/**
 * Admin Reminder Control Screen
 * Allows admins to control and manage reminder system settings
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../constants/theme';
import CrossPlatformAlert from '../../utils/crossPlatformAlert';

const AdminReminderControlScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    autoAssignment: true,
    reminderNotifications: true,
    overdueAlerts: true,
    dailyReports: false,
    weeklyReports: true,
    defaultReminderTime: 30, // minutes before
    maxRemindersPerEmployee: 10,
    autoEscalation: true,
    escalationTime: 24, // hours
  });

  const [employees] = useState([
    { id: 'employee_123', name: 'John Doe', active: true, reminderCount: 5 },
    { id: 'employee_456', name: 'Jane Smith', active: true, reminderCount: 8 },
    { id: 'employee_789', name: 'Bob Johnson', active: false, reminderCount: 3 },
  ]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    CrossPlatformAlert.alert('Settings Saved', 'Reminder system settings have been updated.');
  };

  const handleEmployeeToggle = (employeeId) => {
    CrossPlatformAlert.alert(
      'Toggle Employee',
      'This will enable/disable reminder assignments for this employee.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => console.log('Toggle employee:', employeeId) },
      ]
    );
  };

  const handleBulkReassign = () => {
    CrossPlatformAlert.alert(
      'Bulk Reassign',
      'Reassign all pending reminders to active employees?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reassign', onPress: () => console.log('Bulk reassign') },
      ]
    );
  };

  const handleClearCompleted = () => {
    CrossPlatformAlert.alert(
      'Clear Completed',
      'Delete all completed reminders older than 30 days?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => console.log('Clear completed') },
      ]
    );
  };

  const renderSettingRow = (icon, title, description, value, onValueChange, type = 'switch') => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <MaterialCommunityIcons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#D9D9D9', true: theme.colors.primary }}
        />
      ) : (
        <TextInput
          style={styles.numberInput}
          value={value?.toString()}
          onChangeText={(text) => onValueChange(parseInt(text) || 0)}
          keyboardType="numeric"
        />
      )}
    </View>
  );

  const renderEmployeeRow = (employee) => (
    <View key={employee.id} style={styles.employeeRow}>
      <View style={styles.employeeInfo}>
        <View style={[styles.statusDot, { backgroundColor: employee.active ? '#52C41A' : '#D9D9D9' }]} />
        <View style={styles.employeeDetails}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeStats}>
            {employee.reminderCount} active reminders • {employee.active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.toggleButton, employee.active && styles.activeToggleButton]}
        onPress={() => handleEmployeeToggle(employee.id)}
      >
        <MaterialCommunityIcons
          name={employee.active ? 'pause' : 'play'}
          size={16}
          color={employee.active ? '#FA8C16' : '#52C41A'}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* System Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Settings</Text>
        
        {renderSettingRow(
          'auto-fix',
          'Auto Assignment',
          'Automatically assign new reminders to available employees',
          settings.autoAssignment,
          (value) => handleSettingChange('autoAssignment', value)
        )}
        
        {renderSettingRow(
          'bell',
          'Reminder Notifications',
          'Send push notifications for upcoming reminders',
          settings.reminderNotifications,
          (value) => handleSettingChange('reminderNotifications', value)
        )}
        
        {renderSettingRow(
          'alert-circle',
          'Overdue Alerts',
          'Send alerts when reminders become overdue',
          settings.overdueAlerts,
          (value) => handleSettingChange('overdueAlerts', value)
        )}
        
        {renderSettingRow(
          'trending-up',
          'Auto Escalation',
          'Automatically escalate overdue reminders',
          settings.autoEscalation,
          (value) => handleSettingChange('autoEscalation', value)
        )}
      </View>

      {/* Timing Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timing Settings</Text>
        
        {renderSettingRow(
          'clock',
          'Default Reminder Time',
          'Minutes before event to send reminder',
          settings.defaultReminderTime,
          (value) => handleSettingChange('defaultReminderTime', value),
          'number'
        )}
        
        {renderSettingRow(
          'account-multiple',
          'Max Reminders Per Employee',
          'Maximum active reminders per employee',
          settings.maxRemindersPerEmployee,
          (value) => handleSettingChange('maxRemindersPerEmployee', value),
          'number'
        )}
        
        {renderSettingRow(
          'timer',
          'Escalation Time (Hours)',
          'Hours after due time to escalate',
          settings.escalationTime,
          (value) => handleSettingChange('escalationTime', value),
          'number'
        )}
      </View>

      {/* Reports Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reports</Text>
        
        {renderSettingRow(
          'file-chart',
          'Daily Reports',
          'Generate daily reminder reports',
          settings.dailyReports,
          (value) => handleSettingChange('dailyReports', value)
        )}
        
        {renderSettingRow(
          'chart-line',
          'Weekly Reports',
          'Generate weekly summary reports',
          settings.weeklyReports,
          (value) => handleSettingChange('weeklyReports', value)
        )}
      </View>

      {/* Employee Management Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Employee Management</Text>
          <TouchableOpacity style={styles.addButton}>
            <MaterialCommunityIcons name="account-plus" size={16} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add Employee</Text>
          </TouchableOpacity>
        </View>
        
        {employees.map(renderEmployeeRow)}
      </View>

      {/* Bulk Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bulk Actions</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleBulkReassign}>
          <MaterialCommunityIcons name="shuffle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Bulk Reassign Reminders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleClearCompleted}>
          <MaterialCommunityIcons name="delete-sweep" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Clear Completed Reminders</Text>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <View style={styles.saveSection}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
          <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  numberInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text.primary,
    minWidth: 60,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  employeeStats: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  toggleButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#FFF7E6',
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#FF4D4F',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveSection: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: '#52C41A',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AdminReminderControlScreen;