/**
 * Admin Reminder Monitor Screen
 * Allows admins to monitor all reminders across employees
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../../constants/theme';

const AdminReminderMonitorScreen = ({ navigation }) => {
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    employeeId: '',
    overdue: false,
  });

  useEffect(() => {
    fetchReminders('all');
  }, []);

  // Calculate statistics
  const stats = {
    total: reminders.length,
    pending: reminders.filter(r => r.status === 'pending').length,
    accepted: reminders.filter(r => r.status === 'accepted').length,
    overdue: reminders.filter(r => {
      return new Date(r.reminderDate) < new Date() && r.status !== 'completed';
    }).length,
    completed: reminders.filter(r => r.status === 'completed').length,
  };

  // Filter and search reminders
  const filteredReminders = reminders.filter(reminder => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!reminder.title.toLowerCase().includes(query) &&
          !reminder.description.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filters.status && reminder.status !== filters.status) {
      return false;
    }

    // Priority filter
    if (filters.priority && reminder.priority !== filters.priority) {
      return false;
    }

    // Employee filter
    if (filters.employeeId && reminder.assignedTo !== filters.employeeId) {
      return false;
    }

    // Overdue filter
    if (filters.overdue) {
      const isOverdue = new Date(reminder.reminderDate) < new Date() && 
                       reminder.status !== 'completed';
      if (!isOverdue) return false;
    }

    return true;
  });

  const handleReminderPress = (reminder) => {
    navigation.navigate('ReminderDetail', { reminderId: reminder.id });
  };

  const handleEmployeePress = (employeeId) => {
    setFilters(prev => ({ ...prev, employeeId }));
  };

  const getEmployeeName = (employeeId) => {
    // Mock employee data - in real app, get from employees array
    const employeeMap = {
      'employee_123': 'John Doe',
      'employee_456': 'Jane Smith',
      'employee_789': 'Bob Johnson',
    };
    return employeeMap[employeeId] || 'Unknown';
  };

  const filterConfig = {
    status: {
      type: 'select',
      label: 'Status',
      options: [
        { label: 'All', value: '' },
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    priority: {
      type: 'select',
      label: 'Priority',
      options: [
        { label: 'All', value: '' },
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ],
    },
    employeeId: {
      type: 'select',
      label: 'Employee',
      options: [
        { label: 'All Employees', value: '' },
        { label: 'John Doe', value: 'employee_123' },
        { label: 'Jane Smith', value: 'employee_456' },
        { label: 'Bob Johnson', value: 'employee_789' },
      ],
    },
    overdue: {
      type: 'switch',
      label: 'Show Only Overdue',
    },
  };

  const renderStatCard = (title, count, color, icon) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <View style={styles.statContent}>
        <Text style={styles.statNumber}>{count}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderReminderItem = ({ item }) => (
    <View style={styles.reminderItem}>
      <ReminderCard
        reminder={item}
        onPress={handleReminderPress}
        currentEmployeeId={null} // Admin view, no employee context
        showActions={false}
        showEmployee={true}
        employeeName={getEmployeeName(item.assignedTo)}
      />
      
      {/* Overdue indicator */}
      {new Date(item.reminderDate) < new Date() && item.status !== 'completed' && (
        <View style={styles.overdueIndicator}>
          <MaterialCommunityIcons name="alert" size={16} color="#FF4D4F" />
          <Text style={styles.overdueText}>OVERDUE</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="bell-outline" size={64} color={theme.colors.text.secondary} />
      <Text style={styles.emptyText}>No Reminders Found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery || Object.values(filters).some(f => f) 
          ? 'Try adjusting your search or filters'
          : 'No reminders have been created yet'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with Stats */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        {renderStatCard('Total', stats.total, '#1890FF', 'format-list-bulleted')}
        {renderStatCard('Pending', stats.pending, '#FA8C16', 'clock')}
        {renderStatCard('Accepted', stats.accepted, '#52C41A', 'check-circle')}
        {renderStatCard('Overdue', stats.overdue, '#FF4D4F', 'alert-circle')}
        {renderStatCard('Completed', stats.completed, '#722ED1', 'check-all')}
      </ScrollView>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search reminders..."
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <MaterialCommunityIcons name="filter" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Reminders List */}
      <FlatList
        data={filteredReminders}
        renderItem={renderReminderItem}
        keyExtractor={(item) => item.id?.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={remindersLoading}
            onRefresh={() => fetchReminders('all')}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
      />

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filterConfig={filterConfig}
        currentFilters={filters}
        onApplyFilters={setFilters}
        title="Filter Reminders"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statsContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    minWidth: 120,
  },
  statContent: {
    marginLeft: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  statTitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 12,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  reminderItem: {
    position: 'relative',
  },
  overdueIndicator: {
    position: 'absolute',
    top: 8,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCCC7',
  },
  overdueText: {
    fontSize: 9,
    color: '#FF4D4F',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AdminReminderMonitorScreen;