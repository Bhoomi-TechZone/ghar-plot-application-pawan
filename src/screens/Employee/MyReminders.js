/**
 * Reminder List Screen
 * Displays list of all reminders with filtering
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCRM } from '../context/CRMContext';
import {
  ReminderCard,
  SearchBar,
  FilterModal,
  FloatingActionButton,
} from '../components';
import { theme } from '../../constants/theme';

const ReminderListScreen = ({ navigation }) => {
  const {
    reminders,
    remindersLoading,
    fetchReminders,
    acceptReminder,
    reminderFilter,
  } = useCRM();

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: reminderFilter });

  useEffect(() => {
    fetchReminders(reminderFilter);
  }, [reminderFilter]);

  const handleReminderPress = (reminder) => {
    navigation.navigate('ReminderDetail', { reminderId: reminder.id });
  };

  const handleEditReminder = (reminder) => {
    // Navigate to ReminderDetail for viewing/editing
    navigation.navigate('ReminderDetail', { reminderId: reminder.id, editMode: true });
  };

  const handleAddReminder = () => {
    navigation.navigate('AddReminder');
  };

  const filterTabs = [
    { key: 'today', label: 'Today', icon: 'calendar-today' },
    { key: 'pending', label: 'Pending', icon: 'clock' },
    { key: 'overdue', label: 'Overdue', icon: 'alert-circle' },
    { key: 'all', label: 'All', icon: 'format-list-bulleted' },
  ];

  const handleTabPress = (filter) => {
    fetchReminders(filter);
  };

  const filterConfig = {
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
    status: {
      type: 'multiSelect',
      label: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Completed', value: 'completed' },
      ],
    },
  };

  const renderReminderItem = ({ item }) => (
    <ReminderCard
      reminder={item}
      onPress={handleReminderPress}
      onAccept={acceptReminder}
      onEdit={handleEditReminder}
      currentEmployeeId="employee_123" // In real app, get from auth context
      showActions={true}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="bell-outline" size={64} color={theme.colors.text.secondary} />
      <Text style={styles.emptyText}>No reminders found</Text>
      <Text style={styles.emptySubtext}>
        Add reminders to keep track of important follow-ups
      </Text>
    </View>
  );

  const renderFilterTab = (tab) => {
    const isActive = reminderFilter === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.filterTab, isActive && styles.activeFilterTab]}
        onPress={() => handleTabPress(tab.key)}
      >
        <MaterialCommunityIcons
          name={tab.icon}
          size={16}
          color={isActive ? '#fff' : theme.colors.text.secondary}
        />
        <Text style={[styles.filterTabText, isActive && styles.activeFilterTabText]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {filterTabs.map(renderFilterTab)}
      </View>

      <FlatList
        data={reminders}
        renderItem={renderReminderItem}
        keyExtractor={(item) => item.id?.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={remindersLoading}
            onRefresh={() => fetchReminders(reminderFilter)}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
      />

      <FloatingActionButton
        onPress={handleAddReminder}
        icon="bell-plus"
        label="Add Reminder"
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
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  activeFilterTab: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#fff',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
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

export default ReminderListScreen;